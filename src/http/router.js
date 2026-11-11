function pathSegments(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) {
    throw new TypeError('route paths must be absolute paths');
  }

  return pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
}

export class Router {
  #routes = [];

  add(method, pathname, handler) {
    if (typeof method !== 'string' || method.trim() === '') {
      throw new TypeError('method must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('handler must be a function');
    }

    const segments = pathSegments(pathname);
    const parameterNames = segments
      .filter((segment) => segment.startsWith(':'))
      .map((segment) => segment.slice(1));
    if (
      parameterNames.some((name) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(name))
      || new Set(parameterNames).size !== parameterNames.length
    ) {
      throw new TypeError('route parameters must have unique valid names');
    }

    this.#routes.push({
      method: method.toUpperCase(),
      segments,
      handler,
    });
    return this;
  }

  match(method, pathname) {
    const segments = pathSegments(pathname);
    const normalizedMethod = String(method).toUpperCase();

    for (const route of this.#routes) {
      if (route.method !== normalizedMethod || route.segments.length !== segments.length) {
        continue;
      }

      const params = {};
      let matches = true;
      for (let index = 0; index < segments.length; index += 1) {
        const routeSegment = route.segments[index];
        if (routeSegment.startsWith(':')) {
          params[routeSegment.slice(1)] = segments[index];
        } else if (routeSegment !== segments[index]) {
          matches = false;
          break;
        }
      }

      if (matches) return { handler: route.handler, params };
    }

    return undefined;
  }
}