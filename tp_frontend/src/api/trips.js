import client from './client';

/**
 * Trip 的真实 CRUD 属于模块 3（Trip Management）+ 模块 6（Persistence）。
 * 模块 1 只负责「Trip 列表入口」，因此这里只暴露一个只读接口，
 * 等模块 3 接手后可以把这个文件扩成完整的 trip service。
 *
 * GET /api/trips -> { trips: [{ id, name, city, startDate, endDate, dayCount }] }
 */
export async function listTrips() {
  const { data } = await client.get('/trips');
  return data.trips ?? [];
}

export async function listTripOptions() {
  const { data } = await client.get('/trips/options');
  return {
    trips: data.trips ?? [],
    days: data.days ?? [],
  };
}

export async function getTripDetail(tripId) {
  const { data } = await client.get(`/trips/${encodeURIComponent(tripId)}`);
  return data;
}

export async function addPlanItems(payload) {
  const { data } = await client.post('/plan-items/bulk', payload);
  return data;
}
