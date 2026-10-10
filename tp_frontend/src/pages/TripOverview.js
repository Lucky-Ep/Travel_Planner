import { Alert, Button, Empty, Popconfirm, Select, Space, Spin, message } from 'antd';
import { lazy, Suspense, useEffect, useState } from 'react';
import { createDay, deleteDay, deleteTrip, getTripOverview } from '../api/backend';
import { listTrips } from '../api/trips';
import { dateRevision } from '../utils/date';
import EditVisitTimeButton, { formatVisitTime } from '../components/EditVisitTimeButton';
import DeletePlanItemButton from '../components/DeletePlanItemButton';
import AddPlanItemButton from '../components/AddPlanItemButton';
import TripForm from '../components/TripForm';
import './TripOverview.css';

const TripRouteMap = lazy(() => import('../features/map/TripRouteMap'));

function formatTravelTime(seconds) {
  if (seconds == null) return '路线时间待计算';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `约 ${minutes} 分钟` : `约 ${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}

function formatDistance(meters) {
  if (meters == null) return '';
  return meters < 1000 ? `${meters} 米` : `${(meters / 1000).toFixed(1)} 公里`;
}

export default function TripOverview() {
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [active, setActive] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [error, setError] = useState('');
  const [listVersion, setListVersion] = useState(0);
  const [tripVersion, setTripVersion] = useState(0);
  const [dayActionLoading, setDayActionLoading] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingTrips(true);
    setListError('');
    listTrips()
      .then((data) => {
        if (cancelled) return;
        setTrips(data);
        setSelectedTripId((previous) =>
          data.some((item) => item.id === previous) ? previous : data[0]?.id ?? null,
        );
      })
      .catch((err) => { if (!cancelled) setListError(err.message); })
      .finally(() => { if (!cancelled) setLoadingTrips(false); });
    return () => { cancelled = true; };
  }, [listVersion]);

  useEffect(() => {
    let cancelled = false;
    setOverview(null);
    setError('');
    if (selectedTripId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getTripOverview(selectedTripId)
      .then((data) => {
        if (cancelled) return;
        setOverview(data);
        setCurrentDayIndex((index) => Math.min(index, Math.max(0, data.days.length - 1)));
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTripId, tripVersion]);

  useEffect(() => {
    setCurrentDayIndex(0);
    setActive(null);
  }, [selectedTripId]);

  const refreshOverview = () => {
    setActive(null);
    setTripVersion((version) => version + 1);
  };

  const onTripSaved = (tripId) => {
    setSelectedTripId(tripId);
    setListVersion((version) => version + 1);
    refreshOverview();
  };

  const onTripDeleted = async () => {
    if (deletingTrip || selectedTripId == null) return;
    setDeletingTrip(true);
    try {
      await deleteTrip(selectedTripId);
      message.success('行程已删除');
      setOverview(null);
      setSelectedTripId(null);
      setListVersion((version) => version + 1);
    } catch (err) {
      message.error(err.message);
    } finally {
      setDeletingTrip(false);
    }
  };

  const onDayCreated = async () => {
    if (dayActionLoading || !overview) return;
    const days = overview.days;
    const lastDate = days.at(-1)?.day.date;
    const date = lastDate ? dateRevision(lastDate, 1) : overview.trip.startDate;
    if (!date || date > overview.trip.endDate) {
      message.error('已到行程结束日期，无法继续添加 Day');
      return;
    }
    setDayActionLoading(true);
    try {
      await createDay(overview.trip.id, { date, dayIndex: days.length });
      setCurrentDayIndex(days.length);
      setListVersion((version) => version + 1);
      refreshOverview();
      message.success('Day 已添加');
    } catch (err) {
      message.error(err.message);
    } finally {
      setDayActionLoading(false);
    }
  };

  const onDayDeleted = async () => {
    if (dayActionLoading || !overview?.days.length) return;
    setDayActionLoading(true);
    try {
      await deleteDay(overview.trip.id, overview.days.at(-1).day.id);
      setCurrentDayIndex(Math.max(0, overview.days.length - 2));
      setListVersion((version) => version + 1);
      refreshOverview();
      message.success('最后一个 Day 已删除');
    } catch (err) {
      message.error(err.message);
    } finally {
      setDayActionLoading(false);
    }
  };

  if (loadingTrips) return <div className="tp-trip-loading"><Spin /></div>;
  if (listError) return <Alert type="error" message={listError} action={<Button onClick={() => setListVersion((v) => v + 1)}>重试列表</Button>} />;
  if (trips.length === 0) {
    return <Empty description="还没有行程"><Space><TripForm onSaved={onTripSaved} /><Button onClick={() => setListVersion((v) => v + 1)}>刷新</Button></Space></Empty>;
  }

  const days = overview?.days ?? [];
  const current = days[currentDayIndex] ?? null;
  const currentDay = current?.day ?? null;
  const items = current?.planItems ?? [];

  return (
    <div className="tp-trip-overview">
      <div className="tp-trip-heading">
        <div>
          <span className="tp-trip-eyebrow">MY TRIP</span>
          <h1>{overview?.trip.name ?? '我的行程'}</h1>
          <p>{overview?.trip.city ?? '选择行程，查看每天的路线与景点安排'}</p>
        </div>
        <div className="tp-trip-heading-actions">
          <Select aria-label="选择行程" value={selectedTripId} onChange={setSelectedTripId}
            options={trips.map((trip) => ({ value: trip.id, label: trip.name }))} style={{ minWidth: 190 }} />
          <TripForm onSaved={onTripSaved} />
          {overview && <>
            <TripForm key={overview.trip.id} trip={overview.trip} days={days.map((entry) => entry.day)} onSaved={onTripSaved} />
            <Popconfirm title={`确定删除“${overview.trip.name}”吗？`} description="此行程的 Day 和访问安排也会删除。"
              onConfirm={onTripDeleted} okText="删除" cancelText="取消" okButtonProps={{ danger: true, loading: deletingTrip }}>
              <Button danger loading={deletingTrip}>删除行程</Button>
            </Popconfirm>
          </>}
        </div>
      </div>

      {loading ? <div className="tp-trip-loading"><Spin description="正在整理行程和路线" /></div> : error ? (
        <Alert type="error" message={error} action={<Button onClick={refreshOverview}>重试行程</Button>} />
      ) : <>
        <div className="tp-trip-daybar">
          <div className="tp-trip-day-navigation">
            <Button disabled={currentDayIndex === 0} onClick={() => { setCurrentDayIndex((i) => i - 1); setActive(null); }}>上一天</Button>
            <strong>{currentDay ? `Day ${currentDayIndex + 1} · ${currentDay.date}` : '还没有 Day'}</strong>
            <Button disabled={currentDayIndex >= days.length - 1} onClick={() => { setCurrentDayIndex((i) => i + 1); setActive(null); }}>下一天</Button>
          </div>
          <Space>
            <Button type="primary" loading={dayActionLoading} disabled={dayActionLoading || !overview || (days.length > 0 && days.at(-1).day.date >= overview.trip.endDate)} onClick={onDayCreated}>添加 Day</Button>
            <Popconfirm title="删除最后一个 Day？" description="该 Day 内的访问安排也会删除。" onConfirm={onDayDeleted} okText="删除" cancelText="取消" okButtonProps={{ danger: true, loading: dayActionLoading }}>
              <Button danger loading={dayActionLoading} disabled={dayActionLoading || days.length === 0}>删除最后一个 Day</Button>
            </Popconfirm>
          </Space>
        </div>

        {!currentDay ? <Empty description="这个行程还没有 Day，可点击“添加 Day”" /> : (
          <div className="tp-trip-content">
            <section className="tp-trip-timeline-panel" aria-label="当天行程时间线">
              <div className="tp-trip-section-heading">
                <div><span>DAY {currentDayIndex + 1}</span><h2>当天安排</h2></div>
                <AddPlanItemButton key={currentDay.id} tripId={overview.trip.id} city={overview.trip.city} day={currentDay}
                  nextVisitOrder={Math.max(0, ...items.map((item) => item.visitOrder)) + 1} onCreated={refreshOverview} />
              </div>
              {current.routeStatus === 'unavailable' && <Alert type="warning" showIcon message="路线暂不可用，景点安排仍可查看和编辑" />}
              {current.routeStatus === 'empty' && items.length > 1 && <Alert type="info" showIcon message="当前景点缺少可计算的路线，请检查坐标" />}
              {current.routeStatus === 'ready' && <div className="tp-trip-summary">驾车路线 · {formatDistance(current.route.totalDistanceMeters)} · {formatTravelTime(current.route.totalDurationSeconds)}</div>}
              {items.length === 0 ? <Empty description="这一天还没有安排" /> : (
                <div className="tp-trip-timeline">
                  {current.timeline.map((entry, index) => entry.type === 'poi' ? (
                    <div className={`tp-trip-visit${active?.type === 'poi' && active.id === entry.planItem.id ? ' is-active' : ''}`} key={`poi-${entry.planItem.id}`}>
                      <button type="button" className="tp-trip-visit-main" onClick={() => setActive({ type: 'poi', id: entry.planItem.id })}>
                        <span className="tp-trip-visit-number">{entry.planItem.visitOrder}</span>
                        <span className="tp-trip-visit-text">
                          <strong>{entry.planItem.poiName}</strong>
                          <small>{entry.planItem.poiAddress}</small>
                          <em>{formatVisitTime(entry.planItem.scheduledTime)}</em>
                        </span>
                      </button>
                      <div className="tp-trip-visit-actions">
                        <EditVisitTimeButton tripId={overview.trip.id} planItem={entry.planItem} onSaved={refreshOverview} />
                        <DeletePlanItemButton tripId={overview.trip.id} dayId={currentDay.id} planItemId={entry.planItem.id} onDeleted={refreshOverview} />
                      </div>
                    </div>
                  ) : (
                    <button type="button" key={`travel-${index}`} className={`tp-trip-travel${active?.type === 'travel' && active.fromPlanItemId === entry.fromPlanItemId && active.toPlanItemId === entry.toPlanItemId ? ' is-active' : ''}`}
                      onClick={() => setActive({ type: 'travel', fromPlanItemId: entry.fromPlanItemId, toPlanItemId: entry.toPlanItemId })}>
                      <span className="tp-trip-travel-icon">↳</span>
                      <span><strong>驾车路段</strong><small>{formatTravelTime(entry.durationSeconds)}{entry.distanceMeters != null ? ` · ${formatDistance(entry.distanceMeters)}` : ''}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </section>
            <section className="tp-trip-map-panel" aria-label="当天路线地图">
              <Suspense fallback={<div className="tp-trip-loading"><Spin /></div>}>
                <TripRouteMap day={current} active={active} onSelect={setActive} />
              </Suspense>
            </section>
          </div>
        )}
      </>}
    </div>
  );
}
