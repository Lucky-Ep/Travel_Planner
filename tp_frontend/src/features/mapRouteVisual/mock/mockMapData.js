export const mockPlanItems = [
  {
    id: 1,
    dayId: 1,
    poiId: 101,
    order: 1,
    scheduledTime: "09:00",
    poi: {
      id: 101,
      name: "Tokyo Tower",
      latitude: 35.6586,
      longitude: 139.7454,
    },
  },
  {
    id: 2,
    dayId: 1,
    poiId: 102,
    order: 2,
    scheduledTime: "12:00",
    poi: {
      id: 102,
      name: "Shibuya Crossing",
      latitude: 35.6595,
      longitude: 139.7005,
    },
  },
  {
    id: 3,
    dayId: 1,
    poiId: 103,
    order: 3,
    scheduledTime: "15:00",
    poi: {
      id: 103,
      name: "Shinjuku",
      latitude: 35.6938,
      longitude: 139.7034,
    },
  },
];

export const mockRoute = {
  Len: 9800,
  Time: 3200,
  path: [
    { lat: 35.6586, lng: 139.7454 },
    { lat: 35.6595, lng: 139.7005 },
    { lat: 35.6938, lng: 139.7034 },
  ],
};