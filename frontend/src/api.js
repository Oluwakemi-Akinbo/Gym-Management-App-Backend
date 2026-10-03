const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'gym-management-token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

export async function api(path, { method = 'GET', body, query, auth = true } = {}) {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && tokenStore.get()) headers.Authorization = `Bearer ${tokenStore.get()}`;
  let response;
  try {
    response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error('Unable to connect to the server. Check that the backend is running.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.message || `The request failed (${response.status}).`);
    error.status = response.status;
    if (response.status === 401 && auth) window.dispatchEvent(new Event('gym:session-expired'));
    throw error;
  }
  return payload?.data;
}

export const apiUrl = API_URL;
