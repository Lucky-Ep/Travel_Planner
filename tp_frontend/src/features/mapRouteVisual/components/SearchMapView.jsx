import { useEffect, useRef, useState } from 'react';
import { LngLatBounds, Map, Marker, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { raster2DStyle, vector3DStyle } from '../config/mapStyles';
import { add3DBuildings } from './Buildings3D';
import './SearchMapView.css';

const SHANGHAI_CENTER = [121.4737, 31.2304];

function clearMarkers(markersRef) {
  markersRef.current.forEach((marker) => marker.remove());
  markersRef.current = [];
}

function createPopupContent(poi) {
  const content = document.createElement('div');
  content.className = 'search-map-popup';

  const name = document.createElement('strong');
  name.textContent = poi.name;

  const meta = document.createElement('span');
  meta.textContent = `${poi.chineseName} · ${poi.rating.toFixed(1)} ★`;

  content.append(name, meta);
  return content;
}

function syncMarkers(
  map,
  markersRef,
  pois,
  selectedPoiIds,
  activePoiId,
  onPoiActivate,
) {
  clearMarkers(markersRef);

  const selectedIds = new Set(selectedPoiIds);
  const validPois = pois.filter(
    (poi) => Number.isFinite(poi.longitude) && Number.isFinite(poi.latitude),
  );

  if (!validPois.length) {
    map.easeTo({ center: SHANGHAI_CENTER, zoom: 10, duration: 500 });
    return;
  }

  const bounds = new LngLatBounds();

  markersRef.current = validPois.map((poi, index) => {
    const markerElement = document.createElement('button');
    markerElement.type = 'button';
    markerElement.className = `search-map-marker${selectedIds.has(poi.id) ? ' is-selected' : ''}${activePoiId === poi.id ? ' is-active' : ''}`;
    markerElement.textContent = String(index + 1);
    markerElement.setAttribute('aria-label', poi.name);
    markerElement.addEventListener('click', () => onPoiActivate?.(poi.id));

    const coordinates = [poi.longitude, poi.latitude];
    bounds.extend(coordinates);

    return new Marker({ element: markerElement })
      .setLngLat(coordinates)
      .setPopup(
        new Popup({ offset: 20 }).setDOMContent(createPopupContent(poi)),
      )
      .addTo(map);
  });

  if (validPois.length === 1) {
    map.easeTo({
      center: [validPois[0].longitude, validPois[0].latitude],
      zoom: 14,
      duration: 500,
    });
    return;
  }

  map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 500 });
}

export default function SearchMapView({
  pois,
  selectedPoiIds,
  activePoiId,
  onPoiActivate,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const latestPoisRef = useRef(pois);
  const latestSelectedIdsRef = useRef(selectedPoiIds);
  const latestActivePoiIdRef = useRef(activePoiId);
  const latestOnPoiActivateRef = useRef(onPoiActivate);
  const requestedModeRef = useRef('2d');
  const styleRequestIdRef = useRef(0);
  const [viewMode, setViewMode] = useState('2d');

  latestPoisRef.current = pois;
  latestSelectedIdsRef.current = selectedPoiIds;
  latestActivePoiIdRef.current = activePoiId;
  latestOnPoiActivateRef.current = onPoiActivate;

  useEffect(() => {
    const map = new Map({
      container: containerRef.current,
      style: raster2DStyle,
      center: SHANGHAI_CENTER,
      zoom: 10,
    });

    mapRef.current = map;
    map.on('load', () => {
      syncMarkers(
        map,
        markersRef,
        latestPoisRef.current,
        latestSelectedIdsRef.current,
        latestActivePoiIdRef.current,
        latestOnPoiActivateRef.current,
      );
    });

    return () => {
      styleRequestIdRef.current += 1;
      clearMarkers(markersRef);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncMarkers(
      map,
      markersRef,
      pois,
      selectedPoiIds,
      activePoiId,
      onPoiActivate,
    );
  }, [activePoiId, onPoiActivate, pois, selectedPoiIds]);

  const switchMode = (mode) => {
    const map = mapRef.current;
    if (!map || requestedModeRef.current === mode) return;

    requestedModeRef.current = mode;
    setViewMode(mode);
    clearMarkers(markersRef);

    const requestId = ++styleRequestIdRef.current;
    map.once('style.load', () => {
      if (
        requestId !== styleRequestIdRef.current ||
        requestedModeRef.current !== mode ||
        mapRef.current !== map
      ) {
        return;
      }

      if (mode === '3d') add3DBuildings(map);
      syncMarkers(
        map,
        markersRef,
        latestPoisRef.current,
        latestSelectedIdsRef.current,
        latestActivePoiIdRef.current,
        latestOnPoiActivateRef.current,
      );
      map.easeTo({
        pitch: mode === '3d' ? 60 : 0,
        bearing: mode === '3d' ? -20 : 0,
        duration: 700,
      });
    });
    map.setStyle(mode === '3d' ? vector3DStyle : raster2DStyle);
  };

  return (
    <div className="search-map-view">
      <div className="search-map-toolbar" aria-label="Map view controls">
        <button
          type="button"
          className={viewMode === '2d' ? 'is-active' : ''}
          onClick={() => switchMode('2d')}
        >
          2D
        </button>
        <button
          type="button"
          className={viewMode === '3d' ? 'is-active' : ''}
          onClick={() => switchMode('3d')}
        >
          3D
        </button>
      </div>
      <div
        ref={containerRef}
        className="search-map-canvas"
        role="region"
        aria-label="Map of Shanghai POI search results"
      />
    </div>
  );
}
