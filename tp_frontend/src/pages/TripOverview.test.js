import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TripOverview from './TripOverview';
import { getTripOverview } from '../api/backend';
import { listTrips } from '../api/trips';

jest.mock('../api/backend', () => ({
  getTripOverview: jest.fn(),
  createDay: jest.fn(),
  deleteDay: jest.fn(),
  deleteTrip: jest.fn(),
}));
jest.mock('../api/trips', () => ({ listTrips: jest.fn() }));
jest.mock('../components/TripForm', () => () => <button>TripForm</button>);
jest.mock('../components/AddPlanItemButton', () => () => <button>添加安排</button>);
jest.mock('../components/EditVisitTimeButton', () => ({
  __esModule: true,
  default: () => <button>修改时间</button>,
  formatVisitTime: (value) => value?.slice(0, 5) ?? '未安排时间',
}));
jest.mock('../components/DeletePlanItemButton', () => () => <button>删除安排</button>);
jest.mock('../features/map/TripRouteMap', () => ({ day }) =>
  <div data-testid="trip-route-map">{day.day.date} · {day.routeStatus}</div>
);

const first = { id: 11, dayId: 21, poiId: 101, poiName: 'The Bund', poiAddress: 'Bund', visitOrder: 1, scheduledTime: '09:00', poi: { name: 'The Bund' } };
const second = { id: 12, dayId: 21, poiId: 102, poiName: 'Yu Garden', poiAddress: 'Garden', visitOrder: 2, scheduledTime: '11:00', poi: { name: 'Yu Garden' } };

test('shows the aggregate visit/travel timeline beside the selected day map', async () => {
  listTrips.mockResolvedValue([{ id: 3, name: 'Shanghai Trip' }]);
  getTripOverview.mockResolvedValue({
    trip: { id: 3, name: 'Shanghai Trip', city: 'Shanghai', startDate: '2026-10-01', endDate: '2026-10-02' },
    days: [
      {
        day: { id: 21, dayIndex: 0, date: '2026-10-01' },
        planItems: [first, second],
        timeline: [
          { type: 'poi', planItem: first },
          { type: 'travel', fromPlanItemId: 11, toPlanItemId: 12, distanceMeters: 1200, durationSeconds: 600 },
          { type: 'poi', planItem: second },
        ],
        routeStatus: 'ready',
        route: { totalDistanceMeters: 1200, totalDurationSeconds: 600, legs: [] },
      },
      {
        day: { id: 22, dayIndex: 1, date: '2026-10-02' },
        planItems: [], timeline: [], routeStatus: 'empty',
        route: { totalDistanceMeters: 0, totalDurationSeconds: 0, legs: [] },
      },
    ],
  });

  const user = userEvent.setup();
  render(<TripOverview />);
  expect(await screen.findByText('The Bund')).toBeInTheDocument();
  expect(screen.getByText('Yu Garden')).toBeInTheDocument();
  expect(screen.getByText('驾车路段')).toBeInTheDocument();
  expect(await screen.findByTestId('trip-route-map')).toHaveTextContent('2026-10-01 · ready');

  await user.click(screen.getByRole('button', { name: '下一天' }));
  expect(screen.getByTestId('trip-route-map')).toHaveTextContent('2026-10-02 · empty');
});
