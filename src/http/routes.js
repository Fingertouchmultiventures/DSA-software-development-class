function sendJson(response, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'x-content-type-options': 'nosniff',
  });
  response.end(body);
}

function userId(request) {
  return request.headers['x-user-id'];
}

function toNumber(value) {
  return value === undefined || value === '' ? undefined : Number(value);
}

function toBoolean(value) {
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}

function searchCriteria(query) {
  return {
    q: query.get('q') ?? undefined,
    city: query.get('city') ?? undefined,
    from: query.get('from') ?? undefined,
    to: query.get('to') ?? undefined,
    maxPriceCents: toNumber(query.get('maxPriceCents') ?? undefined),
    onlyAvailable: toBoolean(query.get('onlyAvailable') ?? undefined),
  };
}

export function registerApiRoutes(router, { eventService, bookingService }) {
  router.add('POST', '/api/events', async ({ request, response, body }) => {
    const event = await eventService.createEvent(userId(request), body);
    sendJson(response, 201, event);
  });

  router.add('GET', '/api/events', async ({ response, searchParams }) => {
    const events = await eventService.searchPublishedEvents(
      searchCriteria(searchParams),
      searchParams.get('sort') || 'date',
    );
    sendJson(response, 200, { events });
  });

  router.add('GET', '/api/events/:id', async ({ request, response, params }) => {
    const event = await eventService.getEvent(userId(request), params.id);
    sendJson(response, 200, event);
  });

  router.add('POST', '/api/events/:id/tiers', async ({ request, response, params, body }) => {
    const tier = await eventService.addTier(userId(request), params.id, body);
    sendJson(response, 201, tier);
  });

  router.add('POST', '/api/events/:id/publish', async ({ request, response, params }) => {
    const event = await eventService.publishEvent(userId(request), params.id);
    sendJson(response, 200, event);
  });

  router.add('POST', '/api/events/:id/unpublish', async ({ request, response, params }) => {
    const event = await eventService.unpublishEvent(userId(request), params.id);
    sendJson(response, 200, event);
  });

  router.add('POST', '/api/bookings', async ({ request, response, body }) => {
    const booking = await bookingService.book(userId(request), body);
    sendJson(response, 201, booking);
  });

  router.add('GET', '/api/bookings/:reference', async ({ request, response, params }) => {
    const booking = await bookingService.getBooking(userId(request), params.reference);
    sendJson(response, 200, booking);
  });

  router.add('POST', '/api/bookings/:reference/pay', async ({ request, response, params, body }) => {
    const booking = await bookingService.pay(userId(request), params.reference, body);
    sendJson(response, 200, booking);
  });

  router.add('POST', '/api/bookings/:reference/cancel', async ({ request, response, params }) => {
    const booking = await bookingService.cancel(userId(request), params.reference);
    sendJson(response, 200, booking);
  });

  return router;
}
