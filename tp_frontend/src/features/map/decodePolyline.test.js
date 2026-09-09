import { decodePolyline } from './decodePolyline';

test('decodes Google polyline into MapLibre coordinate order', () => {
  expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
    [-120.2, 38.5],
    [-120.95, 40.7],
    [-126.453, 43.252],
  ]);
});

test('empty route has no coordinates', () => {
  expect(decodePolyline('')).toEqual([]);
});
