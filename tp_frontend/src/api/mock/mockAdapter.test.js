import mockAdapter from "./mockAdapter";
import { mockDb } from "./mockDb";

jest.setTimeout(15000);

const request = (method, url, token, data) =>
  mockAdapter({
    method,
    url,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data,
  }).then((response) => response.data);

const signIn = async (email = "demo@travelplanner.com", password = "demo1234") => {
  const data = await request("post", "/auth/login", null, { email, password });
  return data.token;
};

beforeEach(() => {
  window.localStorage.clear();
  mockDb.reset();
});

test("Trip, Day and PlanItem operations persist and deletion cascades", async () => {
  const token = await signIn();
  const trip = await request("post", "/trips", token, {
    name: "New trip", city: "Tokyo", startDate: "2026-12-01", endDate: "2026-12-03",
  });
  expect(trip.days).toEqual([]);

  await request("patch", `/trips/${trip.id}`, token, {
    name: "Updated trip", city: "Tokyo", startDate: "2026-12-01", endDate: "2026-12-03",
  });
  const firstDay = await request("post", `/trips/${trip.id}/days`, token, { date: "2026-12-01" });
  const secondDay = await request("post", `/trips/${trip.id}/days`, token, { date: "2026-12-02" });
  expect((await request("get", `/trips/${trip.id}`, token)).days).toHaveLength(2);

  const poi = (await request("get", "/pois", token)).pois[0];
  const item = await request("post", `/days/${secondDay.id}/plan-items`, token, {
    poiId: poi.id, scheduledTime: "2026-12-02T09:00:00+09:00",
  });
  expect((await request("get", `/days/${secondDay.id}`, token)).planItems).toEqual([{ id: item.id }]);
  await request("patch", `/plan-items/${item.id}`, token, {
    scheduledTime: "2026-12-02T10:30:00+09:00",
  });
  expect((await request("get", `/plan-items/${item.id}`, token)).scheduledTime)
    .toBe("2026-12-02T10:30:00+09:00");

  await request("delete", `/days/${secondDay.id}`, token);
  expect((await request("get", `/trips/${trip.id}`, token)).days).toEqual([{ id: firstDay.id }]);
  await expect(request("get", `/plan-items/${item.id}`, token)).rejects.toMatchObject({
    response: { status: 404 },
  });

  await request("delete", `/trips/${trip.id}`, token);
  await expect(request("get", `/days/${firstDay.id}`, token)).rejects.toMatchObject({
    response: { status: 404 },
  });
  expect((await request("get", "/trips", token)).trips.some((entry) => entry.id === trip.id))
    .toBe(false);
});

test("Day boundaries and ownership are enforced", async () => {
  const token = await signIn();
  const trip = await request("post", "/trips", token, {
    name: "Short trip", city: "Tokyo", startDate: "2026-12-01", endDate: "2026-12-01",
  });
  await request("post", `/trips/${trip.id}/days`, token, { date: "2026-12-01" });
  await expect(request("post", `/trips/${trip.id}/days`, token, { date: "2026-12-02" }))
    .rejects.toMatchObject({ response: { status: 400 } });

  await request("post", "/auth/register", null, {
    email: "other@example.com", password: "password123", displayName: "Other",
  });
  const otherToken = await signIn("other@example.com", "password123");
  await expect(request("delete", `/trips/${trip.id}`, otherToken))
    .rejects.toMatchObject({ response: { status: 404 } });
  expect((await request("get", `/trips/${trip.id}`, token)).id).toBe(trip.id);
});
