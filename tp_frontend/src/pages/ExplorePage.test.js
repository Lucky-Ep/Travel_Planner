import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { listPOIs } from '../api/backend';
import ExplorePage from './ExplorePage';

jest.mock('../api/backend', () => ({ listPOIs: jest.fn() }));
jest.mock('../features/map/SearchMapView', () => ({
  __esModule: true,
  default: function MockSearchMapView({ pois, onPoiActivate }) {
    return (
      <div>
        <span data-testid="map-count">{pois.length}</span>
        {pois.map((poi) => (
          <button key={poi.id} type="button" onClick={() => onPoiActivate(poi.id)}>
            地图：{poi.name}
          </button>
        ))}
      </div>
    );
  },
}));

const POIS = [
  {
    id: 42,
    externalPlaceId: 'poi-the-bund',
    name: 'The Bund',
    city: 'Shanghai',
    category: 'Landmark',
    address: 'Zhongshan East 1st Road',
    latitude: 31.24,
    longitude: 121.49,
    rating: 4.7,
    imageUrl: '/pois/shanghai-skyline.svg',
  },
  {
    id: 43,
    externalPlaceId: 'custom-poi',
    name: 'New museum',
    city: 'Shanghai',
    category: 'Culture',
    address: 'People Square',
    latitude: 31.23,
    longitude: 121.47,
    rating: null,
    imageUrl: null,
  },
];

test('loads backend POIs and keeps search results in sync with the map', async () => {
  listPOIs.mockResolvedValue(POIS);
  const user = userEvent.setup();
  render(<MemoryRouter><ExplorePage /></MemoryRouter>);

  expect(await screen.findByTestId('map-count')).toHaveTextContent('2');
  expect(listPOIs).toHaveBeenCalledWith('Shanghai');

  await user.type(screen.getByRole('searchbox', { name: '搜索景点' }), 'museum');
  expect(screen.getByTestId('map-count')).toHaveTextContent('1');

  await user.click(screen.getByRole('button', { name: '地图：New museum' }));
  expect(screen.getByRole('heading', { name: 'New museum' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /前往 My Trips/ })).toHaveAttribute('href', '/trips');
});
