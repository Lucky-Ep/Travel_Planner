import { SHANGHAI_POIS } from "./mockpoi";
import { addPlanItems, listTripOptions } from "../../api/trips";

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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
  return addPlanItems(payload);
}

export async function getTripAndDayOptions() {
  return listTripOptions();
}
