import { act, fireEvent, render, screen } from '@testing-library/react';
import TripRouteMap from './TripRouteMap';
import { createRouteAnimation } from './routeAnimation';

const maps = [];
const markers = [];

jest.mock('maplibre-gl', () => {
  class MapMock {
    constructor(options) {
      this.options = options;
      this.handlers = new Map();
      this.layerHandlers = new Map();
      this.layers = new Map();
      this.sources = new Map();
      this.styleLoaded = false;
      this.setStyle = jest.fn(() => {
        this.styleLoaded = false;
        this.layers.clear();
        this.sources.clear();
      });
      this.easeTo = jest.fn();
      this.fitBounds = jest.fn();
      this.setPaintProperty = jest.fn();
      this.remove = jest.fn();
      maps.push(this);
    }

    on(event, layerOrHandler, handler) {
      if (handler) this.layerHandlers.set(`${event}:${layerOrHandler}`, handler);
      else this.handlers.set(event, layerOrHandler);
    }

    off = jest.fn((event, layer) => this.layerHandlers.delete(`${event}:${layer}`));
    emit(event, value = {}) {
      if (event === 'style.load') this.styleLoaded = true;
      this.handlers.get(event)?.(value);
    }
    isStyleLoaded = () => this.styleLoaded;
    getStyle = () => ({ layers: [], sources: {} });
    addSource = jest.fn((id, source) => this.sources.set(id, source));
    getSource = (id) => this.sources.get(id);
    removeSource = jest.fn((id) => this.sources.delete(id));
    addLayer = jest.fn((layer) => this.layers.set(layer.id, layer));
    getLayer = (id) => this.layers.get(id);
    removeLayer = jest.fn((id) => this.layers.delete(id));
    setLayerZoomRange = jest.fn();
  }

  class MarkerMock {
    constructor({ element }) {
      this.element = element;
      this.remove = jest.fn();
      markers.push(this);
    }
    setLngLat = () => this;
    setPopup = () => this;
    addTo = () => this;
    getElement = () => this.element;
  }

  class PopupMock {
    setDOMContent = () => this;
  }

  class BoundsMock {
    extend = () => this;
  }

  return { Map: MapMock, Marker: MarkerMock, Popup: PopupMock, LngLatBounds: BoundsMock };
});

jest.mock('./routeAnimation', () => ({ createRouteAnimation: jest.fn() }));

function makeDay(id = 1, usable = true) {
  return {
    day: { id },
    planItems: [
      { id: id * 10 + 1, poiName: 'Start', longitude: -120.2, latitude: 38.5 },
      { id: id * 10 + 2, poiName: 'End', longitude: -120.95, latitude: 40.7 },
    ],
    route: {
      usable,
      legs: [{
        fromPlanItemId: id * 10 + 1,
        toPlanItemId: id * 10 + 2,
        fromPoiName: 'Start',
        toPoiName: 'End',
        polyline: '_p~iF~ps|U_ulLnnqC',
      }],
    },
  };
}

function controllerFor(options) {
  let snapshot = { progress: options.initialProgress ?? 0, playing: false };
  return {
    play: jest.fn(() => {
      snapshot = { ...snapshot, playing: true };
      options.onChange(snapshot);
    }),
    pause: jest.fn(() => {
      snapshot = { progress: 0.4, playing: false };
      options.onChange(snapshot);
      return snapshot;
    }),
    restart: jest.fn(),
    destroy: jest.fn(),
    getSnapshot: jest.fn(() => snapshot),
  };
}

function installAnimationMock() {
  createRouteAnimation.mockImplementation((map, route, options) =>
    route?.usable === false ? null : controllerFor(options));
}

function loadInitialStyle() {
  act(() => maps.at(-1).emit('style.load'));
}

beforeEach(() => {
  maps.length = 0;
  markers.length = 0;
  createRouteAnimation.mockReset();
  installAnimationMock();
});

test('style switching pauses at current progress and does not resume automatically', () => {
  render(<TripRouteMap day={makeDay()} active={null} onSelect={jest.fn()} />);
  loadInitialStyle();
  const first = createRouteAnimation.mock.results.at(-1).value;
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  fireEvent.click(screen.getByRole('button', { name: '3D' }));
  expect(first.pause).toHaveBeenCalledTimes(1);
  act(() => maps[0].emit('style.load'));
  const replacement = createRouteAnimation.mock.results.at(-1).value;
  expect(createRouteAnimation.mock.calls.at(-1)[2].initialProgress).toBe(0.4);
  expect(replacement.play).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
});

test('rapid mode changes serialize styles and install only the final mode resources', () => {
  render(<TripRouteMap day={makeDay()} active={null} onSelect={jest.fn()} />);
  loadInitialStyle();
  fireEvent.click(screen.getByRole('button', { name: '3D' }));
  fireEvent.click(screen.getByRole('button', { name: '2D' }));
  expect(maps[0].setStyle).toHaveBeenCalledTimes(1);
  act(() => maps[0].emit('style.load'));
  expect(maps[0].setStyle).toHaveBeenCalledTimes(2);
  expect(createRouteAnimation).toHaveBeenCalledTimes(1);
  act(() => maps[0].emit('style.load'));
  expect(createRouteAnimation).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: '2D' })).toHaveClass('is-active');
});

test('fatal 3D style failure falls back to raster while tile errors do not', () => {
  render(<TripRouteMap day={makeDay()} active={null} onSelect={jest.fn()} />);
  loadInitialStyle();
  fireEvent.click(screen.getByRole('button', { name: '3D' }));
  act(() => maps[0].emit('error', { sourceId: 'tiles' }));
  expect(maps[0].setStyle).toHaveBeenCalledTimes(1);
  act(() => maps[0].emit('error', { error: new Error('style failed') }));
  expect(maps[0].setStyle).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: '2D' })).toHaveClass('is-active');
  act(() => maps[0].emit('style.load'));
  expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
});

test('fatal raster style failure unlocks an explicit retry', () => {
  render(<TripRouteMap day={makeDay()} active={null} onSelect={jest.fn()} />);
  act(() => maps[0].emit('error', { error: new Error('raster style failed') }));
  const retry = screen.getByRole('button', { name: '重试' });
  expect(retry).toBeEnabled();
  fireEvent.click(retry);
  expect(maps[0].setStyle).toHaveBeenCalledTimes(1);
  act(() => maps[0].emit('style.load'));
  expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
});

test('changing days resets animation while POI and leg selections preserve it', () => {
  const onSelect = jest.fn();
  const dayOne = makeDay(1);
  const view = render(<TripRouteMap day={dayOne} active={null} onSelect={onSelect} />);
  loadInitialStyle();
  const first = createRouteAnimation.mock.results.at(-1).value;
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));

  view.rerender(<TripRouteMap day={dayOne} active={{ type: 'poi', id: 11 }} onSelect={onSelect} />);
  view.rerender(<TripRouteMap day={dayOne} active={{ type: 'travel', fromPlanItemId: 11, toPlanItemId: 12 }} onSelect={onSelect} />);
  expect(createRouteAnimation).toHaveBeenCalledTimes(1);
  expect(first.destroy).not.toHaveBeenCalled();

  view.rerender(<TripRouteMap day={makeDay(2)} active={null} onSelect={onSelect} />);
  expect(first.destroy).toHaveBeenCalledTimes(1);
  expect(createRouteAnimation.mock.calls.at(-1)[2].initialProgress).toBe(0);
});

test('unmount destroys animation, detaches the route listener, markers, and map', () => {
  const view = render(<TripRouteMap day={makeDay()} active={null} onSelect={jest.fn()} />);
  loadInitialStyle();
  const controller = createRouteAnimation.mock.results.at(-1).value;
  view.unmount();
  expect(controller.destroy).toHaveBeenCalledTimes(1);
  expect(maps[0].off).toHaveBeenCalledWith('click', 'tp-trip-route-line', expect.any(Function));
  expect(markers.every((marker) => marker.remove.mock.calls.length > 0)).toBe(true);
  expect(maps[0].remove).toHaveBeenCalledTimes(1);
});

test('route without usable animation geometry keeps static route and disables controls', () => {
  render(<TripRouteMap day={makeDay(1, false)} active={null} onSelect={jest.fn()} />);
  loadInitialStyle();
  expect(maps[0].getLayer('tp-trip-route-line')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
});
