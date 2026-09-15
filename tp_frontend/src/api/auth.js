import client from './client';

/** POST /api/auth/register -> { token, user } */
export async function register({ email, password, displayName }) {
  const { data } = await client.post('/auth/register', { email, password, displayName });
  return data;
}

/** POST /api/auth/login -> { token, user } */
export async function login({ email, password }) {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

/** POST /api/auth/logout -> 204 */
export async function logout() {
  await client.post('/auth/logout');
}

/** GET /api/auth/me -> { user } */
export async function fetchCurrentUser() {
  const { data } = await client.get('/auth/me');
  return data.user;
}
