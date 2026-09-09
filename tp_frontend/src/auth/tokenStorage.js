/**
 * 登录凭证的存储（模块 1 - User/Auth）
 *
 * 目前方案：JWT 存 localStorage，请求带 Authorization: Bearer <token>。
 * 如果最终和后端对齐成 Session + HttpOnly Cookie，只需要把这个文件改成空实现、
 * 并给 axios 打开 withCredentials，其余代码不受影响。
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
