import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import FullPageSpinner from '../components/FullPageSpinner';
import AuthRecoveryError from './AuthRecoveryError';

/** 已登录时返回受保护页面；只接受站内地址作为登录后的跳转目标。 */
export default function PublicOnlyRoute() {
  const { isAuthenticated, isLoading, recoveryFailed } = useAuth();
  const { state } = useLocation();
  const from = state?.from;
  const pathname = from?.pathname;
  const normalizedPath = typeof pathname === 'string' ? pathname.replace(/\/+$/, '') || '/' : '';
  const isInternalPath = normalizedPath.startsWith('/') &&
    !normalizedPath.startsWith('//') && !normalizedPath.includes('\\') &&
    normalizedPath !== '/login' && normalizedPath !== '/register';
  const destination = isInternalPath
    ? { pathname, search: from.search || '', hash: from.hash || '' }
    : '/';

  if (isLoading) return <FullPageSpinner />;
  if (recoveryFailed) return <AuthRecoveryError />;
  if (isAuthenticated) return <Navigate to={destination} replace />;

  return <Outlet />;
}
