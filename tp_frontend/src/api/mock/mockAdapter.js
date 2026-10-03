import { mockDb, toPublicUser } from './mockDb';

/**
 * 一个 axios adapter，按照 Auth API 契约草案返回假数据。
 * 契约（已和后端草拟，待模块 6 确认）：
 *   POST /api/auth/register  { email, password, displayName } -> 201 { token, user }
 *   POST /api/auth/login     { email, password }              -> 200 { token, user }
 *   POST /api/auth/logout                                     -> 204
 *   GET  /api/auth/me                                         -> 200 { user }
 *   GET  /api/trips                                           -> 200 { trips: [...] }
 * 错误体统一为 { message: string }
 */

const LATENCY_MS = 350;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ok(config, status, data) {
  return { data, status, statusText: 'OK', headers: {}, config, request: {} };
}

function fail(config, status, message) {
  const error = new Error(message);
  error.isAxiosError = true;
  error.config = config;
  error.response = ok(config, status, { message });
  return error;
}

function parseBody(config) {
  if (!config.data) return {};
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data;
}

/** 从 Authorization 头解析出当前用户，未登录返回 null */
function currentUser(config, db) {
  const header = config.headers?.Authorization || config.headers?.authorization;
  if (!header) return null;
  const token = String(header).replace(/^Bearer\s+/i, '');
  const userId = db.sessions[token];
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) || null;
}

function issueToken(db, userId) {
  const token = `mock.${userId}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  db.sessions[token] = userId;
  return token;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function mockAdapter(config) {
  await delay(LATENCY_MS);

  const db = mockDb.read();
  const method = (config.method || 'get').toLowerCase();
  const path = (config.url || '').replace(/^.*\/api/, '') || config.url;
  const body = parseBody(config);

  // ---- Auth ----
  if (method === 'post' && path === '/auth/register') {
    const email = (body.email || '').trim().toLowerCase();
    const { password, displayName } = body;

    if (!EMAIL_RE.test(email)) throw fail(config, 400, '邮箱格式不正确');
    if (!password || password.length < 8) throw fail(config, 400, '密码至少 8 位');
    if (!displayName || !displayName.trim()) throw fail(config, 400, '请填写用户名');
    if (db.users.some((u) => u.email === email)) throw fail(config, 409, '该邮箱已被注册');

    const user = {
      id: db.nextUserId++,
      email,
      password,
      displayName: displayName.trim(),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    const token = issueToken(db, user.id);
    mockDb.write(db);
    return ok(config, 201, { token, user: toPublicUser(user) });
  }

  if (method === 'post' && path === '/auth/login') {
    const email = (body.email || '').trim().toLowerCase();
    const user = db.users.find((u) => u.email === email);
    if (!user || user.password !== body.password) {
      throw fail(config, 401, '邮箱或密码不正确');
    }
    const token = issueToken(db, user.id);
    mockDb.write(db);
    return ok(config, 200, { token, user: toPublicUser(user) });
  }

  if (method === 'post' && path === '/auth/logout') {
    const header = config.headers?.Authorization || config.headers?.authorization;
    if (header) {
      delete db.sessions[String(header).replace(/^Bearer\s+/i, '')];
      mockDb.write(db);
    }
    return ok(config, 204, null);
  }

  if (method === 'get' && path === '/auth/me') {
    const user = currentUser(config, db);
    if (!user) throw fail(config, 401, '登录已过期，请重新登录');
    return ok(config, 200, { user: toPublicUser(user) });
  }

  // ---- Trips（只读，真实实现归模块 3 / 6）----
  if (method === 'get' && path === '/trips') {
    const user = currentUser(config, db);
    if (!user) throw fail(config, 401, '登录已过期，请重新登录');
    return ok(config, 200, { trips: db.trips.filter((t) => t.userId === user.id) });
  }

  throw fail(config, 404, `Mock 未实现的接口：${method.toUpperCase()} ${path}`);
}
