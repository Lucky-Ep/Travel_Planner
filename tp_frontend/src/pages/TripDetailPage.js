import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTripDetail } from '../api/trips';
import FullPageSpinner from '../components/FullPageSpinner';
import { SHANGHAI_POIS } from '../features/poi/mockpoi';
import { formatDateRange } from '../utils/date';
import ModulePlaceholder from './placeholders/ModulePlaceholder';
import './TripDetailPage.css';

const POI_BY_ID = new Map(SHANGHAI_POIS.map((poi) => [poi.id, poi]));

function formatDay(day) {
  if (day.name) return day.name;
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${day.date}T00:00:00`));
  return `Day ${day.dayIndex} · ${date}`;
}

export default function TripDetailPage() {
  const { tripId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(tripId !== 'new');
  const [error, setError] = useState('');

  useEffect(() => {
    if (tripId === 'new') return undefined;
    let active = true;
    setLoading(true);
    setError('');
    void getTripDetail(tripId)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tripId]);

  const itemsByDay = useMemo(() => {
    const grouped = new Map();
    (data?.planItems ?? []).forEach((item) => {
      const items = grouped.get(String(item.dayId)) ?? [];
      items.push(item);
      grouped.set(String(item.dayId), items);
    });
    return grouped;
  }, [data]);

  if (tripId === 'new') {
    return (
      <ModulePlaceholder
        module="3"
        title="创建 Trip"
        todos={['创建 / 编辑 Trip', '添加 Day', '保存到后端']}
      />
    );
  }

  if (loading) return <FullPageSpinner label="加载行程详情中…" />;

  if (error || !data) {
    return (
      <div className="tp-empty">
        <h2>无法加载行程</h2>
        <p>{error || '未找到该行程'}</p>
        <Link className="tp-btn tp-btn-primary" to="/trips">
          返回 My Trips
        </Link>
      </div>
    );
  }

  const { trip, days } = data;
  const totalPois = data.planItems.length;

  return (
    <div className="tp-trip-detail">
      <Link className="tp-trip-back" to="/trips">
        ← My Trips
      </Link>

      <header className="tp-trip-detail-header">
        <div>
          <span>TRIP PLAN</span>
          <h1>{trip.name}</h1>
          <p>
            {trip.city} · {formatDateRange(trip.startDate, trip.endDate)}
          </p>
        </div>
        <div className="tp-trip-summary">
          <strong>{totalPois}</strong>
          <span>{totalPois === 1 ? 'POI' : 'POIs'} planned</span>
        </div>
      </header>

      <div className="tp-trip-days-list">
        {days.map((day) => {
          const dayItems = itemsByDay.get(String(day.id)) ?? [];
          return (
            <section className="tp-trip-day" key={day.id}>
              <header>
                <div>
                  <span>DAY {day.dayIndex}</span>
                  <h2>{formatDay(day)}</h2>
                </div>
                <strong>{dayItems.length}</strong>
              </header>

              {dayItems.length ? (
                <ol className="tp-plan-items">
                  {dayItems.map((item) => {
                    const poi = POI_BY_ID.get(item.poiId);
                    return (
                      <li key={item.id}>
                        <span className="tp-plan-order">{item.order}</span>
                        {poi ? (
                          <>
                            <img src={poi.imageUrl} alt="" />
                            <div>
                              <h3>{poi.name}</h3>
                              <small>{poi.chineseName} · {poi.category}</small>
                              <p>{poi.address}</p>
                            </div>
                            <strong>★ {poi.rating.toFixed(1)}</strong>
                          </>
                        ) : (
                          <div>
                            <h3>{item.poiId}</h3>
                            <small>POI details unavailable</small>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="tp-day-empty">No POIs planned for this day.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
