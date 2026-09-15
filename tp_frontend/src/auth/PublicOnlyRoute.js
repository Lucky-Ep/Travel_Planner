import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import FullPageSpinner from '../components/FullPageSpinner';

/** 已登录用户不该再看到 /login、/register，直接送回主页 */
export default function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}
