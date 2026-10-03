import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import FullPageSpinner from '../components/FullPageSpinner';
import AuthRecoveryError from './AuthRecoveryError';

/** 统一处理认证成功后的跳转，避免页面和守卫同时导航。 */
export default function PublicOnlyRoute() {
  const { isAuthenticated, isLoading, recoveryFailed } = useAuth();
  const { state } = useLocation();
  const from = state?.from;
  const pathname = from?.pathname;
  const isInternalPath = typeof pathname === 'string' && pathname.startsWith('/') &&
    !pathname.startsWith('//') && !pathname.includes('\\') &&
    pathname !== '/login' && pathname !== '/register';
  const destination = isInternalPath
    ? { pathname, search: from.search || '', hash: from.hash || '' }
    : '/';

  if (isLoading) return <FullPageSpinner />;
  if (recoveryFailed) return <AuthRecoveryError />;
  if (isAuthenticated) return <Navigate to={destination} replace />;

  return <Outlet />;
}
