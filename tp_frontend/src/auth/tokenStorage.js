/**
 * 登录凭证的存储（模块 1 - User/Auth）
 *
 * 当前将 Bearer token 存 localStorage；真实 token 的格式待后端确认。
 * 若改为 HttpOnly Cookie，需同步调整 AuthContext 的启动探测和请求凭证配置。
 */
const TOKEN_KEY = 'tp.auth.token';

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* localStorage 不可用（隐私模式）时静默降级为内存态 */
  }
}

export function clearToken() {
  setToken(null);
}
