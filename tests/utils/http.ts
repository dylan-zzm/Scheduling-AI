type FetchMockLike = {
  mock: {
    calls: Array<[unknown, (RequestInit | undefined)?]>;
  };
};

export function createJsonResponse(
  payload: unknown,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  });
}

export function getFetchRequestJson<T = Record<string, unknown>>(
  fetchMock: FetchMockLike,
  callIndex = 0
): T | null {
  const requestInit = fetchMock.mock.calls[callIndex]?.[1];

  if (!requestInit || typeof requestInit.body !== 'string') {
    return null;
  }

  return JSON.parse(requestInit.body) as T;
}
