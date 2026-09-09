import { mockDb, toPublicUser } from "./mockDb";

/**
 * 一个 axios adapter，按照 Auth API 契约草案返回假数据。
 * 契约（已和后端草拟，待模块 6 确认）：
 *   POST /api/auth/register  { email, password, displayName } -> 201 { token, user }
 *   POST /api/auth/login     { email, password }              -> 200 { token, user }
 *   POST /api/auth/logout                                     -> 204
 *   GET  /api/auth/me                                         -> 200 { user }
 *   GET  /api/trips                                           -> 200 { trips: [...] }
 * 错误体统一为 { message: string }
 */

const LATENCY_MS = 350;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ok(config, status, data) {
  return { data, status, statusText: "OK", headers: {}, config, request: {} };
}

function fail(config, status, message) {
  const error = new Error(message);
  error.isAxiosError = true;
  error.config = config;
  error.response = ok(config, status, { message });
  return error;
}

function parseBody(config) {
  if (!config.data) return {};
  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data;
}

/** 从 Authorization 头解析出当前用户，未登录返回 null */
function currentUser(config, db) {
  const header = config.headers?.Authorization || config.headers?.authorization;
  if (!header) return null;
  const token = String(header).replace(/^Bearer\s+/i, "");
  const userId = db.sessions[token];
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) || null;
}

function issueToken(db, userId) {
  const token = `mock.${userId}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  db.sessions[token] = userId;
  return token;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:00(?:Z|[+-]\d{2}:\d{2})$/;

function isDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function nextDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function validateTrip(config, body) {
  if (
    typeof body.name !== "string" || !body.name.trim() ||
    typeof body.city !== "string" || !body.city.trim() ||
    !isDate(body.startDate) || !isDate(body.endDate) ||
    body.endDate < body.startDate
  ) {
    throw fail(config, 400, "请填写行程名称、城市和有效的日期范围");
  }
}

export default async function mockAdapter(config) {
  await delay(LATENCY_MS);

  const db = mockDb.read();
  const method = (config.method || "get").toLowerCase();
  const path = (config.url || "").replace(/^.*\/api/, "") || config.url;
  const body = parseBody(config);

  // ---- Auth ----
  if (method === "post" && path === "/auth/register") {
    const email = (body.email || "").trim().toLowerCase();
    const { password, displayName } = body;

    if (!EMAIL_RE.test(email)) throw fail(config, 400, "邮箱格式不正确");
    if (!password || password.length < 8)
      throw fail(config, 400, "密码至少 8 位");
    if (!displayName || !displayName.trim())
      throw fail(config, 400, "请填写用户名");
    if (db.users.some((u) => u.email === email))
      throw fail(config, 409, "该邮箱已被注册");

    const user = {
      id: db.nextUserId++,
      email,
      password,
      displayName: displayName.trim(),
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    const token = issueToken(db, user.id);
    mockDb.write(db);
    return ok(config, 201, { token, user: toPublicUser(user) });
  }

  if (method === "post" && path === "/auth/login") {
    const email = (body.email || "").trim().toLowerCase();
    const user = db.users.find((u) => u.email === email);
    if (!user || user.password !== body.password) {
      throw fail(config, 401, "邮箱或密码不正确");
    }
    const token = issueToken(db, user.id);
    mockDb.write(db);
    return ok(config, 200, { token, user: toPublicUser(user) });
  }

  if (method === "post" && path === "/auth/logout") {
    const header =
      config.headers?.Authorization || config.headers?.authorization;
    if (header) {
      delete db.sessions[String(header).replace(/^Bearer\s+/i, "")];
      mockDb.write(db);
    }
    return ok(config, 204, null);
  }

  if (method === "get" && path === "/auth/me") {
    const user = currentUser(config, db);
    if (!user) throw fail(config, 401, "登录已过期，请重新登录");
    return ok(config, 200, { user: toPublicUser(user) });
  }

  // All Trip, Day, PlanItem and POI routes require a valid session.
  const user = currentUser(config, db);
  if (!user) throw fail(config, 401, "登录已过期，请重新登录");
  const ownedTrip = (id) => db.trips.find((trip) => trip.id === id && trip.userId === user.id);
  const ownedDay = (id) => {
    const day = db.days.find((item) => item.id === id);
    return day && ownedTrip(day.tripId) ? day : null;
  };

  if (method === "post" && path === "/trips") {
    validateTrip(config, body);
    const trip = {
      id: db.nextTripId++,
      userId: user.id,
      name: body.name.trim(),
      city: body.city.trim(),
      startDate: body.startDate,
      endDate: body.endDate,
      dayCount: 0,
    };
    db.trips.push(trip);
    mockDb.write(db);
    return ok(config, 201, { ...trip, days: [] });
  }

  const tripMatch = path.match(/^\/trips\/(\d+)$/);
  if (tripMatch && (method === "patch" || method === "delete")) {
    const trip = ownedTrip(Number(tripMatch[1]));
    if (!trip) throw fail(config, 404, "找不到该行程");

    if (method === "delete") {
      const dayIds = new Set(db.days.filter((day) => day.tripId === trip.id).map((day) => day.id));
      db.planItems = db.planItems.filter((item) => !dayIds.has(item.dayId));
      db.days = db.days.filter((day) => day.tripId !== trip.id);
      db.trips = db.trips.filter((item) => item.id !== trip.id);
      mockDb.write(db);
      return ok(config, 204, null);
    }

    validateTrip(config, body);
    if (db.days.some((day) => day.tripId === trip.id &&
      (day.date < body.startDate || day.date > body.endDate))) {
      throw fail(config, 400, "日期范围必须包含已有的所有 Day");
    }
    Object.assign(trip, {
      name: body.name.trim(), city: body.city.trim(),
      startDate: body.startDate, endDate: body.endDate,
    });
    mockDb.write(db);
    return ok(config, 200, trip);
  }

  const tripDaysMatch = path.match(/^\/trips\/(\d+)\/days$/);
  if (method === "post" && tripDaysMatch) {
    const trip = ownedTrip(Number(tripDaysMatch[1]));
    if (!trip) throw fail(config, 404, "找不到该行程");
    const days = db.days.filter((day) => day.tripId === trip.id)
      .sort((a, b) => a.dayIndex - b.dayIndex);
    const expected = days.length ? nextDate(days[days.length - 1].date) : trip.startDate;
    if (!isDate(body.date) || body.date !== expected || body.date > trip.endDate) {
      throw fail(config, 400, "只能在行程日期范围内依次添加 Day");
    }
    const day = { id: db.nextDayId++, tripId: trip.id, date: body.date, dayIndex: days.length + 1 };
    db.days.push(day);
    trip.dayCount = days.length + 1;
    mockDb.write(db);
    return ok(config, 201, { ...day, planItems: [] });
  }

  const dayMatch = path.match(/^\/days\/(\d+)$/);
  if (method === "delete" && dayMatch) {
    const day = ownedDay(Number(dayMatch[1]));
    if (!day) throw fail(config, 404, "找不到该日期安排");
    const days = db.days.filter((item) => item.tripId === day.tripId);
    if (day.dayIndex !== Math.max(...days.map((item) => item.dayIndex))) {
      throw fail(config, 400, "只能删除最后一个 Day");
    }
    db.planItems = db.planItems.filter((item) => item.dayId !== day.id);
    db.days = db.days.filter((item) => item.id !== day.id);
    ownedTrip(day.tripId).dayCount = days.length - 1;
    mockDb.write(db);
    return ok(config, 204, null);
  }

  if (method === "get" && path === "/pois") {
    return ok(config, 200, { pois: db.pois });
  }

  const dayItemsMatch = path.match(/^\/days\/(\d+)\/plan-items$/);
  if (method === "post" && dayItemsMatch) {
    const day = ownedDay(Number(dayItemsMatch[1]));
    if (!day) throw fail(config, 404, "找不到该日期安排");
    if (!db.pois.some((poi) => poi.id === body.poiId)) {
      throw fail(config, 400, "请选择有效景点");
    }
    if (body.scheduledTime != null &&
      (!TIME_RE.test(body.scheduledTime) || !Number.isFinite(Date.parse(body.scheduledTime)) ||
        body.scheduledTime.slice(0, 10) !== day.date)) {
      throw fail(config, 400, "访问时间必须属于当前 Day");
    }
    const items = db.planItems.filter((item) => item.dayId === day.id);
    const item = {
      id: db.nextPlanItemId++, dayId: day.id, poiId: body.poiId,
      order: Math.max(0, ...items.map((entry) => entry.order)) + 1,
      scheduledTime: body.scheduledTime ?? null,
      reminderTime: body.reminderTime ?? null,
    };
    db.planItems.push(item);
    mockDb.write(db);
    return ok(config, 201, item);
  }

  const planItemMatch = path.match(/^\/plan-items\/(\d+)$/);

  if (method === "delete" && planItemMatch) {
    const user = currentUser(config, db);
    if (!user) throw fail(config, 401, "请先登录");

    const id = Number(planItemMatch[1]);
    const planItem = db.planItems.find((item) => item.id === id);
    const day = db.days.find((item) => item.id === planItem?.dayId);
    const trip = db.trips.find((item) => item.id === day?.tripId);

    if (!planItem || !day || !trip || trip.userId !== user.id) {
      throw fail(config, 404, "找不到该访问安排");
    }

    db.planItems = db.planItems.filter((item) => item.id !== id);
    mockDb.write(db);

    return ok(config, 204, null);
  }

  if (method === "patch" && planItemMatch) {
    const user = currentUser(config, db);
    if (!user) throw fail(config, 401, "请先登录");

    const id = Number(planItemMatch[1]);
    const planItem = db.planItems.find((item) => item.id === id);
    const day = db.days.find((item) => item.id === planItem?.dayId);
    const trip = db.trips.find((item) => item.id === day?.tripId);

    if (!planItem || !day || !trip || trip.userId !== user.id) {
      throw fail(config, 404, "找不到该访问安排");
    }

    if (
      !body ||
      Object.keys(body).length !== 1 ||
      !Object.prototype.hasOwnProperty.call(body, "scheduledTime")
    ) {
      throw fail(config, 400, "本次接口只支持修改访问时间");
    }

    const value = body.scheduledTime;
    const pattern =
      /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:00(?:Z|[+-]\d{2}:\d{2})$/;

    const oldOffset =
      planItem.scheduledTime?.match(/(Z|[+-]\d{2}:\d{2})$/)?.[0];

    const newOffset =
      typeof value === "string"
        ? value.match(/(Z|[+-]\d{2}:\d{2})$/)?.[0]
        : null;

    if (
      typeof value !== "string" ||
      !pattern.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      value.slice(0, 10) !== day.date ||
      !oldOffset ||
      newOffset !== oldOffset
    ) {
      throw fail(config, 400, "请修改当天时间，并保留原时区偏移");
    }

    if (
      planItem.reminderTime &&
      Date.parse(planItem.reminderTime) >= Date.parse(value)
    ) {
      throw fail(config, 400, "访问时间必须晚于提醒时间");
    }

    planItem.scheduledTime = value;
    mockDb.write(db);

    return ok(config, 200, planItem);
  }

  // ---- 行程相关的读取接口 ----
  if (method === "get") {
    const user = currentUser(config, db);

    if (!user) {
      throw fail(config, 401, "登录已过期，请重新登录");
    }

    const findOwnedTrip = (tripId) => {
      return db.trips.find(
        (trip) => trip.id === tripId && trip.userId === user.id
      );
    };

    // 查询当前用户的行程列表。
    if (path === "/trips") {
      const trips = db.trips
        .filter((trip) => trip.userId === user.id)
        .map((trip) => ({
          ...trip,
          dayCount: db.days.filter((day) => day.tripId === trip.id).length,
        }));

      return ok(config, 200, { trips });
    }

    // 例如 "/trips/101" 拆分后得到 ["trips", "101"]。
    const segments = path.split("/").filter(Boolean);

    if (segments.length === 2 && /^\d+$/.test(segments[1])) {
      const resource = segments[0];
      const id = Number(segments[1]);

      if (resource === "trips") {
        const trip = findOwnedTrip(id);

        if (!trip) {
          throw fail(config, 404, "找不到该行程");
        }

        const days = db.days
          .filter((day) => day.tripId === trip.id)
          .sort((a, b) => a.dayIndex - b.dayIndex)
          .map((day) => ({ id: day.id }));

        return ok(config, 200, {
          ...trip,
          dayCount: days.length,
          days,
        });
      }

      if (resource === "days") {
        const day = db.days.find((item) => item.id === id);

        if (!day || !findOwnedTrip(day.tripId)) {
          throw fail(config, 404, "找不到该日期安排");
        }

        const planItems = db.planItems
          .filter((item) => item.dayId === day.id)
          .sort((a, b) => a.order - b.order)
          .map((item) => ({ id: item.id }));

        return ok(config, 200, {
          ...day,
          planItems,
        });
      }

      if (resource === "plan-items") {
        const planItem = db.planItems.find((item) => item.id === id);
        const day = db.days.find((item) => item.id === planItem?.dayId);

        if (!planItem || !day || !findOwnedTrip(day.tripId)) {
          throw fail(config, 404, "找不到该访问安排");
        }

        return ok(config, 200, planItem);
      }

      if (resource === "pois") {
        const poi = db.pois.find((item) => item.id === id);

        if (!poi) {
          throw fail(config, 404, "找不到该景点");
        }

        return ok(config, 200, poi);
      }
    }
  }

  throw fail(config, 404, `Mock 未实现的接口：${method.toUpperCase()} ${path}`);
}
