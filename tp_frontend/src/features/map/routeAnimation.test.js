import {
  animationFrameAtProgress,
  buildDistanceSegments,
  createRouteAnimation,
  routeAnimationCoordinates,
} from './routeAnimation';

function encodeCoordinate(value) {
  let encoded = '';
  let current = value < 0 ? ~(value << 1) : value << 1;
  while (current >= 0x20) {
    encoded += String.fromCharCode((0x20 | (current & 0x1f)) + 63);
    current >>= 5;
  }
  return encoded + String.fromCharCode(current + 63);
}

function encodePolyline(coordinates) {
  let latitude = 0;
  let longitude = 0;
  return coordinates.map(([lng, lat]) => {
    const nextLatitude = Math.round(lat * 1e5);
    const nextLongitude = Math.round(lng * 1e5);
    const encoded = encodeCoordinate(nextLatitude - latitude) + encodeCoordinate(nextLongitude - longitude);
    latitude = nextLatitude;
    longitude = nextLongitude;
    return encoded;
  }).join('');
}

function leg(from, to, coordinates) {
  return { fromPlanItemId: from, toPlanItemId: to, polyline: encodePolyline(coordinates) };
}

function createMapMock() {
  const sources = new Map();
  const layers = new Map([['tp-trip-route-line', { id: 'tp-trip-route-line' }]]);
  return {
    sources,
    layers,
    addSource: jest.fn((id, source) => sources.set(id, { ...source, setData: jest.fn() })),
    getSource: jest.fn((id) => sources.get(id)),
    removeSource: jest.fn((id) => sources.delete(id)),
    addLayer: jest.fn((layer) => layers.set(layer.id, layer)),
    getLayer: jest.fn((id) => layers.get(id)),
    removeLayer: jest.fn((id) => layers.delete(id)),
  };
}

test('joins ordered backend legs without duplicating their shared endpoint', () => {
  const route = {
    legs: [
      leg(1, 2, [[0, 0], [0.01, 0]]),
      leg(2, 3, [[0.01, 0], [0.02, 0]]),
    ],
  };
  expect(routeAnimationCoordinates(route)).toEqual([[0, 0], [0.01, 0], [0.02, 0]]);
});

test('rejects malformed, out-of-order, or spatially disconnected legs', () => {
  expect(routeAnimationCoordinates({ legs: [leg(1, 2, [[0, 0], [0.01, 0]]), leg(7, 8, [[0.01, 0], [0.02, 0]])] })).toEqual([]);
  expect(routeAnimationCoordinates({ legs: [leg(1, 2, [[0, 0], [0.01, 0]]), leg(2, 3, [[1, 1], [1.01, 1]])] })).toEqual([]);
  expect(routeAnimationCoordinates({ legs: [{ fromPlanItemId: 1, toPlanItemId: 2, polyline: '?' }] })).toEqual([]);
});

test('rejects decoded coordinates outside geographic bounds', () => {
  expect(routeAnimationCoordinates({ legs: [leg(1, 2, [[181, 0], [181.01, 0]])] })).toEqual([]);
  expect(routeAnimationCoordinates({ legs: [leg(1, 2, [[0, 91], [0.01, 91]])] })).toEqual([]);
  expect(routeAnimationCoordinates({ overviewPolyline: encodePolyline([[-181, 0], [-180.9, 0]]) })).toEqual([]);
});

test('uses overview geometry only when the route has no leg geometry', () => {
  const coordinates = [[10, 20], [10.01, 20.01]];
  expect(routeAnimationCoordinates({ legs: [], overviewPolyline: encodePolyline(coordinates) })).toEqual(coordinates);
});

test('interpolates by cumulative geographic distance and ignores zero-length segments', () => {
  const path = buildDistanceSegments([[0, 0], [0, 0], [0.01, 0], [0.03, 0]]);
  const frame = animationFrameAtProgress(path, 0.5);
  expect(path.segments).toHaveLength(2);
  expect(frame.traveler[0]).toBeCloseTo(0.015, 4);
  expect(frame.traveler[1]).toBeCloseTo(0, 6);
  expect(frame.visibleCoordinates[0]).toEqual([0, 0]);
});

test('degenerate routes do not create an animation controller', () => {
  expect(createRouteAnimation(createMapMock(), { legs: [], overviewPolyline: '' })).toBeNull();
  expect(createRouteAnimation(createMapMock(), { legs: [], overviewPolyline: encodePolyline([[1, 1], [1, 1]]) })).toBeNull();
});

test('controller plays, pauses with progress, restarts, and cleans up idempotently', () => {
  const map = createMapMock();
  const callbacks = new Map();
  let nextFrame = 1;
  let clock = 0;
  const cancelFrame = jest.fn((id) => callbacks.delete(id));
  const controller = createRouteAnimation(
    map,
    { legs: [leg(1, 2, [[0, 0], [0.02, 0]])] },
    {
      duration: 1000,
      requestFrame: (callback) => {
        const id = nextFrame++;
        callbacks.set(id, callback);
        return id;
      },
      cancelFrame,
      now: () => clock,
    },
  );

  controller.play();
  const first = callbacks.get(1);
  callbacks.delete(1);
  first(0);
  const second = callbacks.get(2);
  callbacks.delete(2);
  clock = 500;
  second(clock);
  const paused = controller.pause();
  expect(paused.playing).toBe(false);
  expect(paused.progress).toBeCloseTo(0.5, 2);
  expect(cancelFrame).toHaveBeenCalled();

  controller.restart();
  expect(controller.getSnapshot()).toEqual({ progress: 0, playing: true });
  const ids = controller.resourceIds;
  controller.destroy();
  controller.destroy();
  expect(map.getLayer(ids.layerId)).toBeUndefined();
  expect(map.getLayer(ids.travelerLayerId)).toBeUndefined();
  expect(map.getSource(ids.sourceId)).toBeUndefined();
  expect(map.getSource(ids.travelerSourceId)).toBeUndefined();
});

test('a destroyed stale controller cannot remove a newer controller resources', () => {
  const map = createMapMock();
  const route = { legs: [leg(1, 2, [[0, 0], [0.02, 0]])] };
  const first = createRouteAnimation(map, route);
  first.destroy();
  const second = createRouteAnimation(map, route);
  first.destroy();
  expect(map.getLayer(second.resourceIds.layerId)).toBeDefined();
  expect(map.getSource(second.resourceIds.sourceId)).toBeDefined();
  second.destroy();
});

test('replaying a completed animation renders the reset frame before scheduling', () => {
  const map = createMapMock();
  const frames = [];
  const controller = createRouteAnimation(
    map,
    { legs: [leg(1, 2, [[0, 0], [0.01, 0]])] },
    { initialProgress: 1, requestFrame: (callback) => { frames.push(callback); return frames.length; } },
  );
  const routeSource = map.getSource(controller.resourceIds.sourceId);
  routeSource.setData.mockClear();
  controller.play();
  expect(routeSource.setData).toHaveBeenCalledWith(expect.objectContaining({
    geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0]] },
  }));
  expect(frames).toHaveLength(1);
  controller.destroy();
});
