import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="tp-empty">
      <h2>404 · 页面不存在</h2>
      <p>你访问的地址没有对应的页面</p>
      <Link to="/" className="tp-btn tp-btn-primary">
        回到主页
      </Link>
    </div>
  );
}
