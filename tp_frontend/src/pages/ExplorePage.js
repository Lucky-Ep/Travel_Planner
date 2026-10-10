import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPOIs } from '../api/backend';
import { FALLBACK_POI_IMAGE, formatRating, matchesPoi, toExplorePoi } from '../features/poi/poiDisplay';
import './ExplorePage.css';

const SearchMapView = lazy(() => import('../features/map/SearchMapView'));
const CITY = 'Shanghai';

function PoiImage({ poi, className = '' }) {
  const fallbackImageUrl = poi.fallbackImageUrl || FALLBACK_POI_IMAGE;
  return (
    <img
      className={className}
      src={poi.imageUrl}
      alt={poi.name}
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(fallbackImageUrl)) {
          event.currentTarget.src = fallbackImageUrl;
        }
      }}
    />
  );
}

export default function ExplorePage() {
  const [allPois, setAllPois] = useState([]);
  const [query, setQuery] = useState('');
  const [activePoiId, setActivePoiId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    listPOIs(CITY)
      .then((pois) => {
        if (cancelled) return;
        setAllPois(pois.map(toExplorePoi));
      })
      .catch((requestError) => {
        if (cancelled) return;
        setAllPois([]);
        setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const results = useMemo(
    () => allPois.filter((poi) => matchesPoi(poi, query)),
    [allPois, query],
  );
  const activePoi = results.find((poi) => poi.id === activePoiId) ?? null;
  const activatePoi = useCallback((id) => setActivePoiId(id), []);

  return (
    <div className="tp-explore">
      <section className="tp-explore-panel" aria-label="景点搜索与详情">
        <header className="tp-explore-search">
          <div className="tp-explore-search-title">
            <span>EXPLORE SHANGHAI</span>
            <h1>发现 POI</h1>
          </div>
          <label htmlFor="tp-explore-query">搜索景点</label>
          <div className="tp-explore-search-input">
            <input
              id="tp-explore-query"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActivePoiId(null);
              }}
              placeholder="名称、地址或类别，例如 The Bund"
            />
          </div>
        </header>

        <div className="tp-explore-panel-body">
          {loading ? (
            <div className="tp-explore-state" role="status">正在加载上海景点…</div>
          ) : error ? (
            <div className="tp-explore-state" role="alert">
              <strong>景点加载失败</strong>
              <p>{error}</p>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)}>重试</button>
            </div>
          ) : activePoi ? (
            <article className="tp-explore-detail">
              <div className="tp-explore-detail-image">
                <PoiImage poi={activePoi} />
                <button type="button" onClick={() => setActivePoiId(null)}>← 返回搜索结果</button>
              </div>
              <div className="tp-explore-detail-content">
                <span className="tp-explore-category">{activePoi.category || '景点'}</span>
                <h2>{activePoi.name}</h2>
                {activePoi.chineseName && <p className="tp-explore-chinese">{activePoi.chineseName}</p>}
                {formatRating(activePoi.rating) && (
                  <p className="tp-explore-rating">★ {formatRating(activePoi.rating)}</p>
                )}
                {activePoi.description && <p className="tp-explore-description">{activePoi.description}</p>}
                {activePoi.address && <p className="tp-explore-address">⌖ {activePoi.address}</p>}
                {Number.isFinite(activePoi.latitude) && Number.isFinite(activePoi.longitude) && (
                  <p className="tp-explore-coordinates">
                    {activePoi.latitude.toFixed(4)}, {activePoi.longitude.toFixed(4)}
                  </p>
                )}
                {activePoi.tags.length > 0 && (
                  <div className="tp-explore-tags">
                    {activePoi.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                )}
                {activePoi.photoSourceUrl && (
                  <a className="tp-explore-photo-source" href={activePoi.photoSourceUrl} target="_blank" rel="noreferrer">
                    照片来源与许可：Wikimedia Commons ↗
                  </a>
                )}
                <Link className="tp-explore-trip-link" to="/trips">前往 My Trips 添加到行程 →</Link>
              </div>
            </article>
          ) : (
            <section className="tp-explore-results" aria-label="搜索结果">
              <div className="tp-explore-results-heading">
                <h2>{query.trim() ? '搜索结果' : '上海景点'}</h2>
                <span role="status">{results.length} 个地点</span>
              </div>
              {results.length === 0 ? (
                <div className="tp-explore-state">
                  <strong>没有找到匹配的景点</strong>
                  <p>试试名称、地址或类别；也可以清除关键词查看全部。</p>
                </div>
              ) : (
                <div className="tp-explore-cards">
                  {results.map((poi) => (
                    <article className="tp-explore-card" key={poi.id}>
                      <button type="button" className="tp-explore-card-image" onClick={() => activatePoi(poi.id)} aria-label={`查看 ${poi.name} 详情`}>
                        <PoiImage poi={poi} />
                      </button>
                      <div className="tp-explore-card-content">
                        <span className="tp-explore-category">{poi.category || '景点'}</span>
                        <h3><button type="button" onClick={() => activatePoi(poi.id)}>{poi.name}</button></h3>
                        {poi.chineseName && <small>{poi.chineseName}</small>}
                        {poi.address && <p>{poi.address}</p>}
                        <div className="tp-explore-card-footer">
                          {formatRating(poi.rating) && <span>★ {formatRating(poi.rating)}</span>}
                          <button type="button" onClick={() => activatePoi(poi.id)}>查看详情 →</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      <aside className="tp-explore-map-panel" aria-label="上海景点地图">
        <div className="tp-explore-map-status">
          <strong>{activePoi?.name || 'Explore Shanghai'}</strong>
          <span>{activePoi?.chineseName || `${results.length} 个地点显示在地图上`}</span>
        </div>
        <Suspense fallback={<div className="tp-explore-map-loading">地图加载中…</div>}>
          <SearchMapView pois={results} activePoiId={activePoiId} onPoiActivate={activatePoi} />
        </Suspense>
      </aside>
    </div>
  );
}
