const API_BASE = "/api";

const request = (path, { method = "GET", data, expectJson = true } = {}) => {
  const options = {
    method,
    headers: {
      Accept: "application/json",
    },
  };

  if (data !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  }

  return fetch(`${API_BASE}${path}`, options).then((response) => {
    if (!response.ok) {
      return response
        .json()
        .catch(() => null)
        .then((errorData) => {
          const error = new Error(
            typeof errorData?.message === "string"
              ? errorData.message
              : `Request failed (HTTP ${response.status}).`,
          );

          error.status = response.status;
          throw error;
        });
    }

    if (!expectJson) {
      return null;
    }

    return response.json();
  });
};
// trip
export const getTrip = (tripId) => {
  return request(`/trips/${encodeURIComponent(tripId)}`);
};

export const createTrip = ({ name, city, startDate, endDate }) => {
  return request("/trips", {
    method: "POST",
    data: { name, city, startDate, endDate },
  });
};

export const updateTrip = (tripId, { name, city, startDate, endDate }) => {
  return request(`/trips/${encodeURIComponent(tripId)}`, {
    method: "PATCH",
    data: { name, city, startDate, endDate },
  });
};

// day
export const getDay = (dayId) => {
  return request(`/days/${encodeURIComponent(dayId)}`);
};

export const createDay = (tripId, { date }) => {
  return request(`/trips/${encodeURIComponent(tripId)}/days`, {
    method: "POST",
    data: { date },
  });
};

export const updateDay = (dayId, { date }) => {
  return request(`/days/${encodeURIComponent(dayId)}`, {
    method: "PATCH",
    data: { date },
  });
};

export const deleteDay = (dayId) => {
  return request(`/days/${encodeURIComponent(dayId)}`, {
    method: "DELETE",
    expectJson: false,
  });
};

// PlanItem，order，POI
export const getPlanItem = (planItemId) => {
  return request(`/plan-items/${encodeURIComponent(planItemId)}`);
};

export const createPlanItem = (
  dayId,
  { poiId, scheduledTime = null, reminderTime = null },
) => {
  return request(`/days/${encodeURIComponent(dayId)}/plan-items`, {
    method: "POST",
    data: { poiId, scheduledTime, reminderTime },
  });
};

export const updatePlanItem = (planItemId, { scheduledTime, reminderTime }) => {
  return request(`/plan-items/${encodeURIComponent(planItemId)}`, {
    method: "PATCH",
    data: { scheduledTime, reminderTime },
  });
};

export const deletePlanItem = (planItemId) => {
  return request(`/plan-items/${encodeURIComponent(planItemId)}`, {
    method: "DELETE",
    expectJson: false,
  });
};

export const reorderPlanItems = (dayId, orderedIds) => {
  return request(`/days/${encodeURIComponent(dayId)}/plan-items/order`, {
    method: "PUT",
    data: { orderedIds },
    expectJson: false,
  });
};

export const getPOI = (poiId) => {
  return request(`/pois/${encodeURIComponent(poiId)}`);
};
