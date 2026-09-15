import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTrips } from '../api/trips';
import FullPageSpinner from '../components/FullPageSpinner';
import { formatDateRange } from '../utils/date';
import './TripListPage.css';

/**
 * Trip 列表入口（模块 1 的边界到此为止）。
 * 「创建 Trip」「编辑 Trip」的实际逻辑由模块 3 在 /trips/:tripId 里实现。
 */
export default function TripListPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTrips(await listTrips());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <FullPageSpinner label="加载行程中…" />;

  return (
    <div className="tp-trips">
      <header className="tp-page-header">
        <div>
          <h1>My Trips</h1>
          <p>你创建的全部行程</p>
        </div>
        <Link to="/trips/new" className="tp-btn tp-btn-primary">
          + 新建行程
        </Link>
      </header>

      {error ? (
        <div className="tp-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="tp-btn tp-btn-ghost" onClick={load}>
            重试
          </button>
        </div>
      ) : null}

      {!error && trips.length === 0 ? (
        <div className="tp-empty">
          <h2>还没有行程</h2>
          <p>创建第一个行程，开始规划你的路线</p>
          <Link to="/trips/new" className="tp-btn tp-btn-primary">
            创建行程
          </Link>
        </div>
      ) : null}

      <ul className="tp-trip-list">
        {trips.map((trip) => (
          <li key={trip.id}>
            <Link to={`/trips/${trip.id}`} className="tp-trip-card">
              <div className="tp-trip-main">
                <span className="tp-trip-name">{trip.name}</span>
                <span className="tp-trip-meta">
                  {trip.city} · {formatDateRange(trip.startDate, trip.endDate)}
                </span>
              </div>
              <span className="tp-trip-days">{trip.dayCount} 天</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
