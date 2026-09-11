/**
 * Thin fetch wrapper for the JSON API. Attaches the bearer token (if any)
 * and throws an Error with a readable message on non-2xx responses so
 * calling code can just try/catch.
 */
const Api = (() => {
  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = State.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { error: text };
      }
    }

    if (!res.ok) {
      const error = new Error((data && data.error) || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path),
  };
})();
