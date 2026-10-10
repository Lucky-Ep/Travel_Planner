import { useCallback, useEffect, useRef, useState } from 'react';
import { LngLatBounds, Map as MapLibreMap, Marker, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { decodePolyline } from './decodePolyline';
import './TripRouteMap.css';

const SHANGHAI_CENTER = [121.4737, 31.2304];
const RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};
const VECTOR_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const SOURCE_ID = 'tp-trip-route';
const LAYER_ID = 'tp-trip-route-line';

const validPoint = (item) =>
  Number.isFinite(item.longitude) && Number.isFinite(item.latitude);
const legKey = (leg) => `${leg.fromPlanItemId}:${leg.toPlanItemId}`;
const activeLegKey = (active) =>
  active?.type === 'travel' ? `${active.fromPlanItemId}:${active.toPlanItemId}` : '';

function add3DBuildings(map) {
  const style = map.getStyle();
  const layers = style?.layers ?? [];
  const sources = style?.sources ?? {};
  const building = layers.find(
    (layer) => layer['source-layer'] === 'building' && sources[layer.source]?.type === 'vector',
  );
  if (!building) return;
  if (building.type === 'fill-extrusion') {
    map.setLayerZoomRange(building.id, 13, 24);
    return;
  }
  if (map.getLayer('tp-trip-buildings')) return;
  const firstLabel = layers.find((layer) => layer.type === 'symbol' && layer.layout?.['text-field']);
  map.addLayer({
    id: 'tp-trip-buildings',
    type: 'fill-extrusion',
    source: building.source,
    'source-layer': building['source-layer'],
    minzoom: 13,
    paint: {
      'fill-extrusion-color': '#d9d8d3',
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
      'fill-extrusion-opacity': 0.8,
    },
  }, firstLabel?.id);
}

function routeFeatures(day) {
  const legs = (day?.route?.legs ?? []).flatMap((leg) => {
    try {
      const coordinates = decodePolyline(leg.polyline);
      if (coordinates.length < 2) return [];
      return [{
        type: 'Feature',
        properties: { key: legKey(leg), from: leg.fromPoiName, to: leg.toPoiName },
        geometry: { type: 'LineString', coordinates },
      }];
    } catch {
      return [];
    }
  });
  if (legs.length) return legs;
  try {
    const coordinates = decodePolyline(day?.route?.overviewPolyline);
    return coordinates.length < 2 ? [] : [{
      type: 'Feature',
      properties: { key: 'overview' },
      geometry: { type: 'LineString', coordinates },
    }];
  } catch {
    return [];
  }
}

function highlightRoute(map, active) {
  if (!map.getLayer(LAYER_ID)) return;
  const key = activeLegKey(active);
  map.setPaintProperty(LAYER_ID, 'line-color', [
    'case', ['==', ['get', 'key'], key], '#ef7d32', '#2563eb',
  ]);
  map.setPaintProperty(LAYER_ID, 'line-width', [
    'case', ['==', ['get', 'key'], key], 8, 5,
  ]);
}

export default function TripRouteMap({ day, active, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeClickRef = useRef(null);
  const latestRef = useRef({ day, active, onSelect });
  const modeRef = useRef('2d');
  const [mode, setMode] = useState('2d');
  const [error, setError] = useState('');
  latestRef.current = { day, active, onSelect };

  const clearTravel = useCallback((map) => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (routeClickRef.current && map.getLayer(LAYER_ID)) {
      map.off('click', LAYER_ID, routeClickRef.current);
    }
    routeClickRef.current = null;
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  }, []);

  const draw = useCallback((map) => {
    clearTravel(map);
    const current = latestRef.current;
    const items = (current.day?.planItems ?? []).filter(validPoint);
    const bounds = new LngLatBounds();

    markersRef.current = items.map((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tp-trip-map-marker';
      button.textContent = String(index + 1);
      button.dataset.planItemId = String(item.id);
      button.setAttribute('aria-label', `定位到 ${item.poiName}`);
      button.addEventListener('click', () => latestRef.current.onSelect({ type: 'poi', id: item.id }));
      const title = document.createElement('strong');
      title.textContent = item.poiName;
      const popup = document.createElement('div');
      popup.append(title);
      const location = [item.longitude, item.latitude];
      bounds.extend(location);
      return new Marker({ element: button })
        .setLngLat(location)
        .setPopup(new Popup({ offset: 20 }).setDOMContent(popup))
        .addTo(map);
    });

    const features = routeFeatures(current.day);
    if (features.length) {
      features.forEach((feature) => feature.geometry.coordinates.forEach((point) => bounds.extend(point)));
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.85 },
      });
      routeClickRef.current = (event) => {
        const key = event.features?.[0]?.properties?.key;
        const [from, to] = key?.split(':') ?? [];
        if (from && to) latestRef.current.onSelect({ type: 'travel', fromPlanItemId: Number(from), toPlanItemId: Number(to) });
      };
      map.on('click', LAYER_ID, routeClickRef.current);
      highlightRoute(map, current.active);
    }

    if (items.length === 1) {
      map.easeTo({ center: [items[0].longitude, items[0].latitude], zoom: 13, duration: 400 });
    } else if (items.length > 1) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 400 });
    } else {
      map.easeTo({ center: SHANGHAI_CENTER, zoom: 10, duration: 400 });
    }
  }, [clearTravel]);

  useEffect(() => {
    let map;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: RASTER_STYLE,
        center: SHANGHAI_CENTER,
        zoom: 10,
      });
      mapRef.current = map;
      map.on('error', () => setError('地图底图加载失败，请检查网络连接。'));
      map.on('style.load', () => {
        setError('');
        if (modeRef.current === '3d') add3DBuildings(map);
        draw(map);
      });
    } catch {
      setError('无法初始化地图，请检查浏览器是否支持 WebGL。');
    }
    return () => {
      if (map) {
        clearTravel(map);
        map.remove();
      }
      mapRef.current = null;
    };
  }, [clearTravel, draw]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) draw(map);
  }, [day, draw]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    highlightRoute(map, active);
    markersRef.current.forEach((marker) => {
      marker.getElement().classList.toggle(
        'is-active', active?.type === 'poi' && Number(marker.getElement().dataset.planItemId) === active.id,
      );
    });
    if (active?.type === 'poi') {
      const item = day?.planItems?.find((candidate) => candidate.id === active.id);
      if (item && validPoint(item)) map.easeTo({ center: [item.longitude, item.latitude], zoom: 14, duration: 400 });
    } else if (active?.type === 'travel') {
      const leg = day?.route?.legs?.find((candidate) =>
        candidate.fromPlanItemId === active.fromPlanItemId && candidate.toPlanItemId === active.toPlanItemId
      );
      try {
        const coordinates = decodePolyline(leg?.polyline);
        if (coordinates.length) {
          map.easeTo({ center: coordinates[Math.floor(coordinates.length / 2)], zoom: 13, duration: 400 });
        }
      } catch {
        // A malformed segment should not hide the remaining map and markers.
      }
    }
  }, [active, day]);

  const switchMode = (next) => {
    const map = mapRef.current;
    if (!map || next === mode) return;
    clearTravel(map);
    modeRef.current = next;
    setMode(next);
    map.setStyle(next === '3d' ? VECTOR_STYLE : RASTER_STYLE);
    map.easeTo({ pitch: next === '3d' ? 60 : 0, bearing: next === '3d' ? -20 : 0, duration: 500 });
  };

  return (
    <div className="tp-trip-map">
      <div className="tp-trip-map-toolbar" aria-label="地图模式">
        <button type="button" className={mode === '2d' ? 'is-active' : ''} onClick={() => switchMode('2d')}>2D</button>
        <button type="button" className={mode === '3d' ? 'is-active' : ''} onClick={() => switchMode('3d')}>3D</button>
      </div>
      <div ref={containerRef} className="tp-trip-map-canvas" role="region" aria-label="行程路线地图" />
      {error && <p className="tp-trip-map-error" role="alert">{error}</p>}
    </div>
  );
}
