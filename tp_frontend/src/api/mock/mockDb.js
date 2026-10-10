/**
 * Mock 数据层：用 localStorage 模拟后端数据库，刷新不丢。
 * 后端 Auth / Trip 接口 ready 之后，整个 mock 目录可以直接删掉。
 */
const DB_KEY = "tp.mock.db.v2";

const seed = {
  users: [
    {
      id: 1,
      email: "demo@travelplanner.com",
      password: "demo1234",
      displayName: "Demo User",
      createdAt: "2026-09-01T10:00:00Z",
    },
  ],
  // Trip 的真实 CRUD 归模块 3 / 模块 6，这里只放少量数据让「Trip 列表入口」能展示
  trips: [
    {
      id: 101,
      userId: 1,
      name: "My Trip to Tokyo",
      city: "Tokyo",
      startDate: "2026-10-01",
      endDate: "2026-10-05",
      dayCount: 5,
    },
    {
      id: 102,
      userId: 1,
      name: "Weekend in Seattle",
      city: "Seattle",
      startDate: "2026-11-14",
      endDate: "2026-11-16",
      dayCount: 3,
    },
  ],

  days: [
    { id: 1001, tripId: 101, date: "2026-10-01", dayIndex: 1 },
    { id: 1002, tripId: 101, date: "2026-10-02", dayIndex: 2 },
    { id: 1003, tripId: 101, date: "2026-10-03", dayIndex: 3 },
    { id: 1004, tripId: 101, date: "2026-10-04", dayIndex: 4 },
    { id: 1005, tripId: 101, date: "2026-10-05", dayIndex: 5 },

    { id: 1006, tripId: 102, date: "2026-11-14", dayIndex: 1 },
    { id: 1007, tripId: 102, date: "2026-11-15", dayIndex: 2 },
    { id: 1008, tripId: 102, date: "2026-11-16", dayIndex: 3 },
  ],

  planItems: [
    {
      id: 2001,
      dayId: 1001,
      poiId: 3001,
      order: 1,
      scheduledTime: "2026-10-01T09:00:00+09:00",
      reminderTime: null,
    },
    {
      id: 2002,
      dayId: 1001,
      poiId: 3002,
      order: 2,
      scheduledTime: "2026-10-01T13:00:00+09:00",
      reminderTime: null,
    },
    {
      id: 2003,
      dayId: 1006,
      poiId: 3003,
      order: 1,
      scheduledTime: "2026-11-14T09:00:00-08:00",
      reminderTime: null,
    },
  ],

  pois: [
    {
      id: 3001,
      name: "Senso-ji",
      address: "2 Chome-3-1 Asakusa, Tokyo",
    },
    {
      id: 3002,
      name: "Tokyo Skytree",
      address: "1 Chome-1-2 Oshiage, Tokyo",
    },
    {
      id: 3003,
      name: "Pike Place Market",
      address: "85 Pike Street, Seattle",
    },
  ],

  sessions: {}, // token -> userId
  nextUserId: 2,
  nextTripId: 103,
  nextDayId: 1009,
  nextPlanItemId: 2004,
};

function read() {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      // Older v2 databases did not keep counters for newly writable resources.
      db.days ??= [];
      db.planItems ??= [];
      db.pois ??= [];
      db.nextDayId ??= Math.max(1000, ...db.days.map((day) => day.id)) + 1;
      db.nextPlanItemId ??= Math.max(2000, ...db.planItems.map((item) => item.id)) + 1;
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
