import axios from "axios";
import config from "../config";

// Until the Auth API is available, Trip requests use the seeded development user.
const userId = config.devUserId;
const tripRoot = `/users/${userId}/trips`;

const api = axios.create({
  baseURL: `${config.apiBaseUrl}/api`,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.message =
      error?.response?.data?.message ||
      (error?.response?.status
        ? `请求失败 (${error.response.status})`
        : "网络异常，请检查后端和数据库是否已启动");
    return Promise.reject(error);
  },
);

const tripPath = (tripId) => `${tripRoot}/${encodeURIComponent(tripId)}`;
const dayPath = (tripId, dayId) =>
  `${tripPath(tripId)}/days/${encodeURIComponent(dayId)}`;
const itemPath = (tripId, dayId, itemId) =>
  `${dayPath(tripId, dayId)}/plan-items/${encodeURIComponent(itemId)}`;

const withPoi = (item) => ({
  ...item,
  poi: {
    id: item.poiId,
    name: item.poiName,
    address: item.poiAddress,
    category: item.poiCategory,
    latitude: item.latitude,
    longitude: item.longitude,
    imageUrl: item.imageUrl,
  },
});

export async function listTrips() {
  return (await api.get(tripRoot)).data;
}

export async function getTrip(tripId) {
  return (await api.get(tripPath(tripId))).data;
}

export async function getTripOverview(tripId) {
  const overview = (await api.get(`${tripPath(tripId)}/overview`)).data;
  return {
    ...overview,
    days: overview.days.map((entry) => ({
      ...entry,
      planItems: entry.planItems.map(withPoi),
      timeline: entry.timeline.map((item) =>
        item.type === "poi" ? { ...item, planItem: withPoi(item.planItem) } : item
      ),
    })),
  };
}

export async function createTrip(trip) {
  return (await api.post(tripRoot, trip)).data;
}

export async function updateTrip(tripId, trip) {
  return (await api.put(tripPath(tripId), trip)).data;
}

export async function deleteTrip(tripId) {
  await api.delete(tripPath(tripId));
}

export async function listDays(tripId) {
  return (await api.get(`${tripPath(tripId)}/days`)).data;
}

export async function createDay(tripId, day) {
  return (await api.post(`${tripPath(tripId)}/days`, day)).data;
}

export async function deleteDay(tripId, dayId) {
  await api.delete(dayPath(tripId, dayId));
}

export async function listPlanItems(tripId, dayId) {
  const response = await api.get(`${dayPath(tripId, dayId)}/plan-items`);
  return response.data.map(withPoi);
}

export async function getPlanItem(tripId, dayId, itemId) {
  return withPoi((await api.get(itemPath(tripId, dayId, itemId))).data);
}

export async function createPlanItem(tripId, dayId, item) {
  return withPoi((await api.post(`${dayPath(tripId, dayId)}/plan-items`, item)).data);
}

export async function updatePlanItem(tripId, dayId, item, changes) {
  const payload = {
    poiId: item.poiId,
    visitOrder: item.visitOrder,
    scheduledTime: item.scheduledTime,
    durationMinutes: item.durationMinutes,
    note: item.note,
    reminderMinutesBefore: item.reminderMinutesBefore,
    ...changes,
  };
  return withPoi((await api.put(itemPath(tripId, dayId, item.id), payload)).data);
}

export async function deletePlanItem(tripId, dayId, itemId) {
  await api.delete(itemPath(tripId, dayId, itemId));
}

export async function listPOIs(city) {
  return (await api.get("/pois", { params: { city } })).data;
}
