import { decodePolyline } from './decodePolyline';

export const ANIMATION_SOURCE_PREFIX = 'tp-animated-route';
export const ANIMATION_LAYER_PREFIX = 'tp-animated-route-line';
export const TRAVELER_SOURCE_PREFIX = 'tp-route-traveler';
export const TRAVELER_LAYER_PREFIX = 'tp-route-traveler-point';

const EARTH_RADIUS_METERS = 6371000;
const JOIN_TOLERANCE_METERS = 2;
let nextAnimationId = 1;

function sameCoordinate(left, right) {
  return left[0] === right[0] && left[1] === right[1];
}

function validCoordinate(coordinate) {
  return Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1]) &&
    coordinate[0] >= -180 && coordinate[0] <= 180 &&
    coordinate[1] >= -90 && coordinate[1] <= 90;
}

export function geographicDistance(start, end) {
  const latitude1 = (start[1] * Math.PI) / 180;
  const latitude2 = (end[1] * Math.PI) / 180;
  const latitudeDelta = ((end[1] - start[1]) * Math.PI) / 180;
  const longitudeDelta = ((end[0] - start[0]) * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function decodeSegment(polyline) {
  if (!polyline) return null;
  try {
    const coordinates = decodePolyline(polyline);
    return coordinates.length >= 2 && coordinates.every(validCoordinate) ? coordinates : null;
  } catch {
    return null;
  }
}

function deduplicateCoordinates(coordinates) {
  return coordinates.filter((coordinate, index) =>
    index === 0 || !sameCoordinate(coordinate, coordinates[index - 1])
  );
}

/**
 * Builds one trustworthy continuous path from the backend route DTO.
 * If leg geometry is present, every leg must be valid, ordered, and spatially
 * contiguous. We never bridge a gap with a synthetic straight line.
 */
export function routeAnimationCoordinates(route) {
  const legs = route?.legs ?? [];
  if (legs.length) {
    const coordinates = [];
    let previousLeg = null;

    for (const leg of legs) {
      const decoded = decodeSegment(leg.polyline);
      if (!decoded) return [];
      if (
        previousLeg &&
        previousLeg.toPlanItemId != null &&
        leg.fromPlanItemId != null &&
        previousLeg.toPlanItemId !== leg.fromPlanItemId
      ) {
        return [];
      }

      if (coordinates.length) {
        const previousEnd = coordinates[coordinates.length - 1];
        const nextStart = decoded[0];
        if (geographicDistance(previousEnd, nextStart) > JOIN_TOLERANCE_METERS) return [];
        decoded.shift();
      }
      coordinates.push(...decoded);
      previousLeg = leg;
    }
    return deduplicateCoordinates(coordinates);
  }

  return deduplicateCoordinates(decodeSegment(route?.overviewPolyline) ?? []);
}

export function buildDistanceSegments(coordinates) {
  const points = deduplicateCoordinates(coordinates ?? []);
  const segments = [];
  let totalDistance = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const distance = geographicDistance(start, end);
    if (!Number.isFinite(distance) || distance <= 0) continue;
    segments.push({ start, end, startDistance: totalDistance, endDistance: totalDistance + distance });
    totalDistance += distance;
  }
  return { coordinates: points, segments, totalDistance };
}

export function animationFrameAtProgress(path, requestedProgress) {
  if (!path?.segments?.length || !(path.totalDistance > 0)) return null;
  const progress = Math.min(1, Math.max(0, requestedProgress ?? 0));
  const targetDistance = path.totalDistance * progress;
  const visible = [path.segments[0].start];
  let traveler = path.segments[0].start;

  for (const segment of path.segments) {
    if (targetDistance >= segment.endDistance) {
      visible.push(segment.end);
      traveler = segment.end;
      continue;
    }
    const fraction = Math.max(
      0,
      Math.min(1, (targetDistance - segment.startDistance) / (segment.endDistance - segment.startDistance)),
    );
    traveler = [
      segment.start[0] + (segment.end[0] - segment.start[0]) * fraction,
      segment.start[1] + (segment.end[1] - segment.start[1]) * fraction,
    ];
    visible.push(traveler);
    break;
  }

  if (visible.length === 1) visible.push(visible[0]);
  return { progress, traveler, visibleCoordinates: visible };
}

function feature(type, coordinates) {
  return { type: 'Feature', properties: {}, geometry: { type, coordinates } };
}

export function createRouteAnimation(map, route, {
  beforeLayerId,
  duration = 10000,
  initialProgress = 0,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
  now = () => performance.now(),
  onChange = () => {},
} = {}) {
  const path = buildDistanceSegments(routeAnimationCoordinates(route));
  if (!path.segments.length || !(path.totalDistance > 0)) return null;

  const instanceId = nextAnimationId++;
  const sourceId = `${ANIMATION_SOURCE_PREFIX}-${instanceId}`;
  const layerId = `${ANIMATION_LAYER_PREFIX}-${instanceId}`;
  const travelerSourceId = `${TRAVELER_SOURCE_PREFIX}-${instanceId}`;
  const travelerLayerId = `${TRAVELER_LAYER_PREFIX}-${instanceId}`;
  let progress = Math.min(1, Math.max(0, initialProgress));
  let playing = false;
  let destroyed = false;
  let frameId = null;
  let startedAt = null;
  let startedFromProgress = progress;

  map.addSource(sourceId, { type: 'geojson', data: feature('LineString', [path.segments[0].start, path.segments[0].start]) });
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#0f172a', 'line-width': 7, 'line-opacity': 1 },
  }, beforeLayerId);
  map.addSource(travelerSourceId, { type: 'geojson', data: feature('Point', path.segments[0].start) });
  map.addLayer({
    id: travelerLayerId,
    type: 'circle',
    source: travelerSourceId,
    paint: {
      'circle-radius': 8,
      'circle-color': '#f8fafc',
      'circle-stroke-color': '#0f172a',
      'circle-stroke-width': 4,
    },
  });

  const snapshot = () => ({ progress, playing });

  const render = () => {
    if (destroyed) return;
    const frame = animationFrameAtProgress(path, progress);
    map.getSource(sourceId)?.setData(feature('LineString', frame.visibleCoordinates));
    map.getSource(travelerSourceId)?.setData(feature('Point', frame.traveler));
    onChange(snapshot());
  };

  const animate = (timestamp) => {
    if (!playing || destroyed) return;
    if (startedAt == null) startedAt = timestamp;
    const remainingDuration = duration * (1 - startedFromProgress);
    const elapsedFraction = remainingDuration <= 0 ? 1 : (timestamp - startedAt) / remainingDuration;
    progress = Math.min(1, startedFromProgress + elapsedFraction * (1 - startedFromProgress));
    render();
    if (progress >= 1) {
      playing = false;
      frameId = null;
      onChange(snapshot());
      return;
    }
    frameId = requestFrame(animate);
  };

  const play = () => {
    if (playing || destroyed) return;
    if (progress >= 1) {
      progress = 0;
      render();
    }
    playing = true;
    startedAt = null;
    startedFromProgress = progress;
    onChange(snapshot());
    frameId = requestFrame(animate);
  };

  const pause = () => {
    if (destroyed) return snapshot();
    if (playing && startedAt != null) {
      const elapsed = Math.max(0, now() - startedAt);
      const remainingDuration = duration * (1 - startedFromProgress);
      progress = Math.min(1, startedFromProgress + (remainingDuration <= 0 ? 1 : elapsed / remainingDuration) * (1 - startedFromProgress));
    }
    playing = false;
    startedAt = null;
    startedFromProgress = progress;
    if (frameId != null) cancelFrame(frameId);
    frameId = null;
    render();
    return snapshot();
  };

  const restart = () => {
    if (destroyed) return;
    if (frameId != null) cancelFrame(frameId);
    frameId = null;
    playing = false;
    progress = 0;
    startedAt = null;
    startedFromProgress = 0;
    render();
    play();
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    playing = false;
    if (frameId != null) cancelFrame(frameId);
    frameId = null;
    if (map.getLayer(travelerLayerId)) map.removeLayer(travelerLayerId);
    if (map.getSource(travelerSourceId)) map.removeSource(travelerSourceId);
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  };

  render();
  return { play, pause, restart, destroy, getSnapshot: snapshot, resourceIds: { sourceId, layerId, travelerSourceId, travelerLayerId } };
}
