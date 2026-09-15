import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listTrips } from '../api/trips';
import './HomePage.css';

/** 用户主页：身份信息 + Trip 列表入口（模块 1 的两个交付物） */
export default function HomePage() {
  const { user } = useAuth();
  const [tripCount, setTripCount] = useState(null); // null = 还在加载
  // 失败单独记一个 flag，不然「加载失败」和「真的 0 条行程」显示出来一模一样
  const [countFailed, setCountFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listTrips()
      .then((trips) => {
        if (!cancelled) setTripCount(trips.length);
      })
      .catch(() => {
        if (!cancelled) setCountFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="tp-home">
      <section className="tp-hero">
        <p className="tp-hero-eyebrow">欢迎回来</p>
        <h1>{user?.displayName}</h1>
        <p className="tp-hero-sub">{user?.email}</p>
      </section>

      <section className="tp-stats">
        <div className="tp-stat">
          <span className="tp-stat-value">{countFailed || tripCount === null ? '—' : tripCount}</span>
          <span className="tp-stat-label">{countFailed ? '行程数加载失败' : '我的行程'}</span>
        </div>
        <div className="tp-stat">
          <span className="tp-stat-value">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '—'}
          </span>
          <span className="tp-stat-label">注册时间</span>
        </div>
      </section>

      <section className="tp-entries">
        <Link to="/trips" className="tp-entry tp-entry-primary">
          <span className="tp-entry-title">My Trips</span>
          <span className="tp-entry-desc">查看和管理你的所有行程</span>
        </Link>

        <Link to="/explore" className="tp-entry">
          <span className="tp-entry-title">发现 POI</span>
          <span className="tp-entry-desc">搜索景点并加入行程</span>
        </Link>
      </section>
    </div>
  );
}
