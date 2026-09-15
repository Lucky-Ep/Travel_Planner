import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import FullPageSpinner from '../components/FullPageSpinner';

/**
 * 路由守卫：未登录访问受保护页面 -> 跳 /login，并把原地址记在 state 里，
 * 登录成功后再跳回去（deep link 不丢）。
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner label="正在恢复登录状态…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
