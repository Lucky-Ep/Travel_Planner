import { useEffect, useRef, useState } from 'react';
import { LngLatBounds, Map as MapLibreMap, Marker, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './SearchMapView.css';

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

function popupContent(poi) {
  const content = document.createElement('div');
  content.className = 'tp-search-map-popup';
  const title = document.createElement('strong');
  title.textContent = poi.name;
  content.append(title);

  const details = [poi.chineseName, poi.category].filter(Boolean).join(' · ');
  if (details) {
    const subtitle = document.createElement('span');
    subtitle.textContent = details;
    content.append(subtitle);
  }
  return content;
}

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
  if (map.getLayer('tp-search-map-buildings')) return;
  const firstLabel = layers.find(
    (layer) => layer.type === 'symbol' && layer.layout?.['text-field'],
  );
  map.addLayer({
    id: 'tp-search-map-buildings',
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

function syncMarkers(map, markersRef, { pois, activePoiId, onPoiActivate }) {
  markersRef.current.forEach((marker) => marker.remove());
  markersRef.current = [];

  const validPois = pois.filter(
    (poi) => Number.isFinite(poi.longitude) && Number.isFinite(poi.latitude),
  );
  if (!validPois.length) {
    map.easeTo({ center: SHANGHAI_CENTER, zoom: 10, duration: 400 });
    return;
  }

  const bounds = new LngLatBounds();
  markersRef.current = validPois.map((poi, index) => {
    const markerButton = document.createElement('button');
    markerButton.type = 'button';
    markerButton.className = `tp-search-map-marker${poi.id === activePoiId ? ' is-active' : ''}`;
    markerButton.textContent = String(index + 1);
    markerButton.setAttribute('aria-label', `查看 ${poi.name}`);
    markerButton.addEventListener('click', () => onPoiActivate(poi.id));

    const coordinates = [poi.longitude, poi.latitude];
    bounds.extend(coordinates);
    return new Marker({ element: markerButton })
      .setLngLat(coordinates)
      .setPopup(new Popup({ offset: 20 }).setDOMContent(popupContent(poi)))
      .addTo(map);
  });

  const activePoi = validPois.find((poi) => poi.id === activePoiId);
  if (activePoi || validPois.length === 1) {
    const poi = activePoi ?? validPois[0];
    map.easeTo({ center: [poi.longitude, poi.latitude], zoom: 14, duration: 400 });
  } else {
    map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 400 });
  }
}

export default function SearchMapView({ pois, activePoiId, onPoiActivate }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const latestPropsRef = useRef({ pois, activePoiId, onPoiActivate });
  const styleRequestRef = useRef(0);
  const [mode, setMode] = useState('2d');
  const [error, setError] = useState('');

  latestPropsRef.current = { pois, activePoiId, onPoiActivate };

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
      map.on('error', () => {
        setError('地图底图加载失败，请检查网络连接。');
      });
      map.on('style.load', () => setError(''));
      map.on('load', () => syncMarkers(map, markersRef, latestPropsRef.current));
    } catch {
      setError('无法初始化地图，请检查浏览器是否支持 WebGL。');
    }

    return () => {
      styleRequestRef.current += 1;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) {
      syncMarkers(map, markersRef, { pois, activePoiId, onPoiActivate });
    }
  }, [pois, activePoiId, onPoiActivate]);

  const switchMode = (nextMode) => {
    const map = mapRef.current;
    if (!map || nextMode === mode) return;
    setMode(nextMode);
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const requestId = ++styleRequestRef.current;

    map.once('style.load', () => {
      if (requestId !== styleRequestRef.current || mapRef.current !== map) return;
      if (nextMode === '3d') add3DBuildings(map);
      syncMarkers(map, markersRef, latestPropsRef.current);
      map.easeTo({
        pitch: nextMode === '3d' ? 60 : 0,
        bearing: nextMode === '3d' ? -20 : 0,
        duration: 600,
      });
    });
    map.setStyle(nextMode === '3d' ? VECTOR_STYLE : RASTER_STYLE);
  };

  return (
    <div className="tp-search-map">
      <div className="tp-search-map-toolbar" aria-label="地图模式">
        <button type="button" className={mode === '2d' ? 'is-active' : ''} onClick={() => switchMode('2d')}>2D</button>
        <button type="button" className={mode === '3d' ? 'is-active' : ''} onClick={() => switchMode('3d')}>3D</button>
      </div>
      <div ref={containerRef} className="tp-search-map-canvas" role="region" aria-label="上海景点地图" />
      {error && <p className="tp-search-map-error" role="alert">{error}</p>}
    </div>
  );
}
