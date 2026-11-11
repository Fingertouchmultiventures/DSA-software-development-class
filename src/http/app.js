import { readFile, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import {
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { DomainError } from '../domain/errors.js';
import { createMemoryRepository } from '../repositories/memory.js';
import { createBookingService } from '../services/bookingService.js';
import { createEventService } from '../services/eventService.js';
import { createMockPaymentGateway } from '../lib/mockPaymentGateway.js';
import { Router } from './router.js';
import { registerApiRoutes } from './routes.js';

const DEFAULT_PUBLIC_DIR = fileURLToPath(new URL('../../public/', import.meta.url));
const MAX_BODY_BYTES = 1_000_000;
const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendJson(response, status, value, method) {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'x-content-type-options': 'nosniff',
  });
  response.end(method === 'HEAD' ? undefined : body);
}

async function readJsonBody(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new HttpError(413, 'BODY_TOO_LARGE', 'Request body is too large');
    }
    chunks.push(chunk);
  }

  if (totalBytes === 0) return undefined;
  const contentType = request.headers['content-type'] ?? '';
  if (!/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|$)/i.test(contentType)) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'BAD_JSON', 'Request body must contain valid JSON');
  }
}

function isWithinDirectory(directory, target) {
  const relativePath = relative(directory, target);
  return relativePath === ''
    || (!isAbsolute(relativePath)
      && relativePath !== '..'
      && !relativePath.startsWith(`..${sep}`));
}

async function serveStatic(request, response, pathname, publicDir) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Request path is invalid');
  }

  let root;
  try {
    root = await realpath(publicDir);
  } catch {
    throw new HttpError(404, 'NOT_FOUND', 'File not found');
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^[/\\]+/, '');
  const candidate = resolve(root, relativePath);
  if (!isWithinDirectory(root, candidate)) {
    throw new HttpError(404, 'NOT_FOUND', 'File not found');
  }

  let filePath;
  let fileStats;
  try {
    filePath = await realpath(candidate);
    if (!isWithinDirectory(root, filePath)) {
      throw new HttpError(404, 'NOT_FOUND', 'File not found');
    }
    fileStats = await stat(filePath);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(404, 'NOT_FOUND', 'File not found');
  }
  if (!fileStats.isFile()) {
    throw new HttpError(404, 'NOT_FOUND', 'File not found');
  }

  const content = await readFile(filePath);
  response.writeHead(200, {
    'content-type': CONTENT_TYPES.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream',
    'content-length': content.length,
    'x-content-type-options': 'nosniff',
  });
  response.end(request.method === 'HEAD' ? undefined : content);
}

function requestUrl(request) {
  try {
    return new URL(request.url, 'http://localhost');
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Request URL is invalid');
  }
}

function sendError(request, response, error) {
  if (response.headersSent || response.destroyed) return;

  const isBadPath = error instanceof URIError;
  const isExpected = error instanceof HttpError || error instanceof DomainError || isBadPath;
  const domainStatuses = new Map([
    ['VALIDATION', 400],
    ['BAD_JSON', 400],
    ['UNAUTHENTICATED', 401],
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 404],
    ['PAYMENT_DECLINED', 402],
    ['CAPACITY_EXCEEDED', 409],
    ['SOLD_OUT', 409],
    ['INVALID_STATE', 409],
    ['INVALID_TRANSITION', 409],
  ]);
  const status = error instanceof HttpError
    ? error.status
    : error instanceof DomainError
      ? domainStatuses.get(error.code) ?? 400
      : isBadPath ? 400 : 500;
  const code = isBadPath ? 'BAD_REQUEST' : isExpected ? error.code : 'INTERNAL_ERROR';
  const message = isBadPath
    ? 'Request path is invalid'
    : status >= 500 ? 'Internal server error' : error.message;
  sendJson(response, status, { error: { code, message } }, request.method);
}

export function createApp({
  publicDir = DEFAULT_PUBLIC_DIR,
  repository = createMemoryRepository(),
  paymentGateway = createMockPaymentGateway(),
} = {}) {
  const router = new Router();
  const eventService = createEventService(repository);
  const bookingService = createBookingService(repository, paymentGateway);
  router.add('GET', '/health', ({ response, request }) => {
    sendJson(response, 200, { status: 'ok' }, request.method);
  });
  registerApiRoutes(router, { eventService, bookingService });

  return async function app(request, response) {
    try {
      const url = requestUrl(request);
      const body = await readJsonBody(request);
      const match = router.match(request.method, url.pathname);

      if (match) {
        await match.handler({
          request,
          response,
          params: match.params,
          searchParams: url.searchParams,
          body,
        });
        return;
      }

      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        throw new HttpError(404, 'NOT_FOUND', 'API route not found');
      }
      await serveStatic(request, response, url.pathname, publicDir);
    } catch (error) {
      sendError(request, response, error);
    }
  };
}

export function createHttpServer(options) {
  return createServer(createApp(options));
}