import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './NavBar.css';

/** 全局导航（模块 1）。模块 2/3/4 的一级入口都挂在这里。 */
const NAV_ITEMS = [
  { to: '/', label: '主页', end: true },
  { to: '/trips', label: 'My Trips' },
  { to: '/explore', label: '发现 POI' }, // 模块 2
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // 登出后 ProtectedRoute 会把整个布局换成 /login，本组件跟着卸载，不用自己跳
  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <header className="tp-navbar">
      <div className="tp-navbar-inner">
        <Link to="/" className="tp-brand">
          <span className="tp-brand-mark">TP</span>
          Travel Planner
        </Link>

        <nav className="tp-nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'tp-nav-link is-active' : 'tp-nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="tp-nav-user">
          <span className="tp-nav-username" title={user?.email}>
            {user?.displayName}
          </span>
          <button type="button" className="tp-btn tp-btn-ghost" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? '登出中…' : '登出'}
          </button>
        </div>
      </div>
    </header>
  );
}
