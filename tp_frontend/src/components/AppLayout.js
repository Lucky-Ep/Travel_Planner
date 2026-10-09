import { Outlet, useLocation } from 'react-router-dom';
import NavBar from './NavBar';
import './AppLayout.css';

/** 登录后的主框架：顶部导航 + 内容区。模块 2/3/4 的页面都会渲染进 <Outlet />。 */
export default function AppLayout() {
  const { pathname } = useLocation();
  const isExplorePage = pathname === '/explore';

  return (
    <div className="tp-app">
      <NavBar />
      <main className={`tp-main${isExplorePage ? ' tp-main--explore' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
