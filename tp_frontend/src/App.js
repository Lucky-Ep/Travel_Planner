import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import PublicOnlyRoute from './auth/PublicOnlyRoute';
import AppLayout from './components/AppLayout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import TripListPage from './pages/TripListPage';
import NotFoundPage from './pages/NotFoundPage';
import ExplorePage from './pages/placeholders/ExplorePage';
import TripDetailPage from './pages/placeholders/TripDetailPage';

/**
 * 全局路由表（模块 1）。
 *
 * /login, /register        公开，已登录会被弹回主页
 * 其余全部走 ProtectedRoute，未登录一律跳 /login
 *
 * 模块 2/3/4 加页面时，只需要在下面受保护的那段里加一行 <Route>，
 * 登录态、导航、布局都会自动生效。
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/trips" element={<TripListPage />} />
              <Route path="/trips/:tripId" element={<TripDetailPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
