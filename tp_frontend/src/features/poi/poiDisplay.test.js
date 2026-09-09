import { formatRating, matchesPoi, toExplorePoi } from './poiDisplay';

test('keeps the backend POI id while enriching seeded Shanghai display fields', () => {
  const poi = toExplorePoi({
    id: 42,
    externalPlaceId: 'poi-the-bund',
    name: 'The Bund',
    latitude: 31.24,
    longitude: 121.49,
    imageUrl: '/pois/shanghai-skyline.svg',
  });

  expect(poi.id).toBe(42);
  expect(poi.chineseName).toBe('外滩');
  expect(matchesPoi(poi, '外滩')).toBe(true);
});

test('supports backend POIs without optional presentation fields', () => {
  const poi = toExplorePoi({ id: 84, externalPlaceId: 'new-place', name: 'New place', rating: null });

  expect(poi.tags).toEqual([]);
  expect(poi.imageUrl).toBe('/pois/shanghai-skyline.svg');
  expect(formatRating(poi.rating)).toBeNull();
  expect(matchesPoi(poi, 'new')).toBe(true);
});

test('links Wikimedia photo URLs to their source and license page', () => {
  const poi = toExplorePoi({
    id: 42,
    externalPlaceId: 'poi-the-bund',
    name: 'The Bund',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/The_Bund_2.jpg/330px-The_Bund_2.jpg',
  });

  expect(poi.photoSourceUrl).toBe('https://commons.wikimedia.org/wiki/File:The_Bund_2.jpg');
});
