/**
 * Mock 数据层：用 localStorage 模拟后端数据库，刷新不丢。
 * 后端 Auth / Trip 接口 ready 之后，整个 mock 目录可以直接删掉。
 */
const DB_KEY = 'tp.mock.db';

const seed = {
  users: [
    {
      id: 1,
      email: 'demo@travelplanner.com',
      password: 'demo1234',
      displayName: 'Demo User',
      createdAt: '2026-09-01T10:00:00Z',
    },
  ],
  // Trip 的真实 CRUD 归模块 3 / 模块 6，这里只放少量数据让「Trip 列表入口」能展示
  trips: [
    {
      id: 101,
      userId: 1,
      name: 'My Trip to Tokyo',
      city: 'Tokyo',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      dayCount: 5,
    },
    {
      id: 102,
      userId: 1,
      name: 'Weekend in Seattle',
      city: 'Seattle',
      startDate: '2026-11-14',
      endDate: '2026-11-16',
      dayCount: 3,
    },
    {
      id: 'trip-shanghai-weekend',
      userId: 1,
      name: 'Shanghai Weekend',
      city: 'Shanghai',
      startDate: '2026-10-18',
      endDate: '2026-10-19',
      dayCount: 2,
    },
    {
      id: 'trip-shanghai-five-days',
      userId: 1,
      name: 'Shanghai Five-Day Trip',
      city: 'Shanghai',
      startDate: '2026-11-03',
      endDate: '2026-11-07',
      dayCount: 5,
    },
  ],
  days: [
    { id: '101-day-1', tripId: 101, date: '2026-10-01', dayIndex: 1 },
    { id: '101-day-2', tripId: 101, date: '2026-10-02', dayIndex: 2 },
    { id: '102-day-1', tripId: 102, date: '2026-11-14', dayIndex: 1 },
    {
      id: 'weekend-day-1',
      tripId: 'trip-shanghai-weekend',
      date: '2026-10-18',
      dayIndex: 1,
    },
    {
      id: 'weekend-day-2',
      tripId: 'trip-shanghai-weekend',
      date: '2026-10-19',
      dayIndex: 2,
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `five-day-${index + 1}`,
      tripId: 'trip-shanghai-five-days',
      date: `2026-11-0${index + 3}`,
      dayIndex: index + 1,
    })),
  ],
  planItems: [],
  sessions: {}, // token -> userId
  nextUserId: 2,
  nextTripId: 103,
};

function read() {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      const seedCopy = JSON.parse(JSON.stringify(seed));

      db.days = Array.isArray(db.days) ? db.days : seedCopy.days;
      db.planItems = Array.isArray(db.planItems) ? db.planItems : [];

      seedCopy.trips.forEach((trip) => {
        if (!db.trips.some((item) => String(item.id) === String(trip.id))) {
          db.trips.push(trip);
        }
      });
      seedCopy.days.forEach((day) => {
        if (!db.days.some((item) => String(item.id) === String(day.id))) {
          db.days.push(day);
        }
      });

      write(db);
      return db;
    }
  } catch {
    /* ignore */
  }
  write(seed);
  return JSON.parse(JSON.stringify(seed));
}

function write(db) {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

export const mockDb = {
  read,
  write,
  reset() {
    try {
      window.localStorage.removeItem(DB_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** 对外返回的 user 不能带 password */
export function toPublicUser(user) {
  const { password, ...rest } = user;
  return rest;
}
