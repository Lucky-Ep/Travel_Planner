import { SHANGHAI_POIS } from "./mockpoi";

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const PLAN_ITEMS_KEY = "mock-shanghai-plan-items";

export async function searchPois(keyword) {
  await delay(280);
  const query = keyword.trim().toLocaleLowerCase();

  if (!query) return SHANGHAI_POIS;

  return SHANGHAI_POIS.filter((poi) =>
    [poi.name, poi.chineseName, poi.address, poi.category, ...poi.tags]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query),
  );
}

export async function addPoisToTripDay(payload) {
  await delay(450);

  const stored = window.localStorage.getItem(PLAN_ITEMS_KEY);
  const parsed = stored ? JSON.parse(stored) : [];
  const currentItems = Array.isArray(parsed) ? parsed : [];
  const existingKeys = new Set(
    currentItems.map((item) => `${item.dayId}:${item.poiId}`),
  );
  const nextItems = [...currentItems];
  let nextOrder =
    currentItems.reduce(
      (highest, item) =>
        item.dayId === payload.dayId ? Math.max(highest, item.order) : highest,
      0,
    ) + 1;

  payload.poiIds.forEach((poiId) => {
    const key = `${payload.dayId}:${poiId}`;
    if (existingKeys.has(key)) return;
    nextItems.push({
      id: `plan-${payload.dayId}-${poiId}`,
      dayId: payload.dayId,
      poiId,
      order: nextOrder++,
    });
    existingKeys.add(key);
  });

  window.localStorage.setItem(PLAN_ITEMS_KEY, JSON.stringify(nextItems));
}
