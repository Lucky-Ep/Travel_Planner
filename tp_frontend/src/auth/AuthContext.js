import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { UNAUTHORIZED_EVENT } from '../api/client';
import { clearToken, getToken, setToken } from './tokenStorage';

const AuthContext = createContext(null);

/** loading: 正在用本地 token 恢复登录态；此时不能渲染受保护页面，否则会闪一下登录页 */
const STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
  RECOVERY_ERROR: 'recovery-error',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);

  // 冷启动和手动重试：暂时无法访问服务不等于凭证失效。
  useEffect(() => {
    // 同步判断，没有 token 就不进异步分支，避免多渲染一帧 loading
    if (!getToken()) {
      setStatus(STATUS.ANONYMOUS);
      return undefined;
    }

    let cancelled = false;

    async function bootstrap() {
      try {
        const me = await authApi.fetchCurrentUser();
        if (cancelled) return;
        setUser(me);
        setStatus(STATUS.AUTHENTICATED);
      } catch (error) {
        if (cancelled) return;
        setUser(null);
        if (error?.response?.status === 401 || !getToken()) {
          clearToken();
          setStatus(STATUS.ANONYMOUS);
        } else {
          setStatus(STATUS.RECOVERY_ERROR);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [recoveryAttempt]);

  const retryRecovery = useCallback(() => {
    setStatus(STATUS.LOADING);
    setRecoveryAttempt((attempt) => attempt + 1);
  }, []);

  // 任意请求返回 401 时，统一退出登录态
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setStatus(STATUS.ANONYMOUS);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user: loggedIn } = await authApi.login(credentials);
    setToken(token);
    setUser(loggedIn);
    setStatus(STATUS.AUTHENTICATED);
    return loggedIn;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: created } = await authApi.register(payload);
    setToken(token);
    setUser(created);
    setStatus(STATUS.AUTHENTICATED);
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // 后端登出失败不该阻塞用户，本地凭证照常清掉
    }
    clearToken();
    setUser(null);
    setStatus(STATUS.ANONYMOUS);
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === STATUS.AUTHENTICATED,
      isLoading: status === STATUS.LOADING,
      recoveryFailed: status === STATUS.RECOVERY_ERROR,
      retryRecovery,
      login,
      register,
      logout,
    }),
    [user, status, retryRecovery, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 <AuthProvider> 内部使用');
  }
  return ctx;
}
