# Travel Planner API Contract

## Development status

The current API uses `userId` in the URL temporarily.

Example:

```text
/api/users/1/trips
```

After authentication is implemented, the backend should obtain the current user from the authentication token instead of accepting `userId` from the URL.

## Base URL

Local backend:

```text
http://localhost:8080
```

All requests and responses use JSON unless otherwise specified.

## Date and time formats

```text
Date: YYYY-MM-DD
Time: HH:mm or HH:mm:ss
```

Examples:

```text
2026-10-01
09:00
09:00:00
```

---

# Trip API

## Create a trip

```http
POST /api/users/{userId}/trips
```

Request:

```json
{
  "name": "San Francisco Trip",
  "city": "San Francisco",
  "countryCode": "US",
  "startDate": "2026-10-01",
  "endDate": "2026-10-03"
}
```

Success:

```text
201 Created
```

Response:

```json
{
  "id": 1,
  "userId": 1,
  "name": "San Francisco Trip",
  "city": "San Francisco",
  "countryCode": "US",
  "startDate": "2026-10-01",
  "endDate": "2026-10-03",
  "createdAt": "2026-09-25T18:30:00",
  "updatedAt": "2026-09-25T18:30:00"
}
```

Trip duration must not exceed 15 days.

Creating a Trip does not currently create TripDays automatically.

## Get all trips for a user

```http
GET /api/users/{userId}/trips
```

Trips are returned in descending `startDate` order.

Response:

```json
[
  {
    "id": 2,
    "userId": 1,
    "name": "New York Trip",
    "city": "New York",
    "countryCode": "US",
    "startDate": "2026-12-01",
    "endDate": "2026-12-05",
    "createdAt": "2026-09-25T18:30:00",
    "updatedAt": "2026-09-25T18:30:00"
  }
]
```

## Get one trip

```http
GET /api/users/{userId}/trips/{tripId}
```

## Update a trip

```http
PUT /api/users/{userId}/trips/{tripId}
```

Request:

```json
{
  "name": "Updated California Trip",
  "city": "Los Angeles",
  "countryCode": "US",
  "startDate": "2026-11-01",
  "endDate": "2026-11-05"
}
```

All fields are required because this is a complete `PUT` update.

## Delete a trip

```http
DELETE /api/users/{userId}/trips/{tripId}
```

Success:

```text
204 No Content
```

Deleting a Trip also deletes its TripDays and PlanItems. Referenced POIs are preserved.

---

# TripDay API

## Create a trip day

```http
POST /api/users/{userId}/trips/{tripId}/days
```

Request:

```json
{
  "dayIndex": 0,
  "date": "2026-10-01"
}
```

Success:

```text
201 Created
```

Response:

```json
{
  "id": 1,
  "tripId": 1,
  "dayIndex": 0,
  "date": "2026-10-01"
}
```

`dayIndex` is zero-based:

```text
First day  = 0
Second day = 1
Third day  = 2
```

The date must match:

```text
trip.startDate + dayIndex
```

## Get all days for a trip

```http
GET /api/users/{userId}/trips/{tripId}/days
```

Days are returned in ascending `dayIndex` order.

## Get one trip day

```http
GET /api/users/{userId}/trips/{tripId}/days/{dayId}
```

## Update a trip day

```http
PUT /api/users/{userId}/trips/{tripId}/days/{dayId}
```

Request:

```json
{
  "dayIndex": 1,
  "date": "2026-10-02"
}
```

## Delete a trip day

```http
DELETE /api/users/{userId}/trips/{tripId}/days/{dayId}
```

Success:

```text
204 No Content
```

Deleting a TripDay also deletes its PlanItems.

---

# POI API

## Save or reuse a POI

```http
POST /api/pois
```

Request:

```json
{
  "externalPlaceId": "google-place-123",
  "name": "Golden Gate Bridge",
  "address": "Golden Gate Bridge",
  "city": "San Francisco",
  "countryCode": "US",
  "category": "Attraction",
  "latitude": 37.8199,
  "longitude": -122.4783,
  "rating": 4.8,
  "imageUrl": "https://example.com/golden-gate.jpg"
}
```

Response:

```json
{
  "id": 8,
  "externalPlaceId": "google-place-123",
  "name": "Golden Gate Bridge",
  "address": "Golden Gate Bridge",
  "city": "San Francisco",
  "countryCode": "US",
  "category": "Attraction",
  "latitude": 37.8199,
  "longitude": -122.4783,
  "rating": 4.8,
  "imageUrl": "https://example.com/golden-gate.jpg",
  "createdAt": "2026-09-25T18:30:00",
  "updatedAt": "2026-09-25T18:30:00"
}
```

If the same `externalPlaceId` already exists, the existing POI is returned instead of creating a duplicate.

## Get one POI

```http
GET /api/pois/{poiId}
```

## Search POIs by city

```http
GET /api/pois?city=San%20Francisco
```

## Search POIs by city and category

```http
GET /api/pois?city=San%20Francisco&category=Attraction
```

City and category matching are case-insensitive.

## Update a POI

```http
PUT /api/pois/{poiId}
```

The `externalPlaceId` cannot be changed.

## Delete a POI

```http
DELETE /api/pois/{poiId}
```

A POI cannot be deleted while it is referenced by a PlanItem.

---

# PlanItem API

## Add a POI to a trip day

First save or reuse the POI through:

```http
POST /api/pois
```

Then use the returned `poiId`:

```http
POST /api/users/{userId}/trips/{tripId}/days/{dayId}/plan-items
```

Request:

```json
{
  "poiId": 8,
  "visitOrder": 1,
  "scheduledTime": "09:00",
  "durationMinutes": 120,
  "note": "Start the day here",
  "reminderMinutesBefore": 30
}
```

Success:

```text
201 Created
```

Response:

```json
{
  "id": 10,
  "dayId": 1,
  "poiId": 8,
  "poiName": "Golden Gate Bridge",
  "poiAddress": "Golden Gate Bridge",
  "poiCategory": "Attraction",
  "latitude": 37.8199,
  "longitude": -122.4783,
  "rating": 4.8,
  "imageUrl": "https://example.com/golden-gate.jpg",
  "visitOrder": 1,
  "scheduledTime": "09:00:00",
  "durationMinutes": 120,
  "note": "Start the day here",
  "reminderMinutesBefore": 30
}
```

If `reminderMinutesBefore` is provided, `scheduledTime` is required.

## Get all plan items for a day

```http
GET /api/users/{userId}/trips/{tripId}/days/{dayId}/plan-items
```

PlanItems are returned in ascending `visitOrder`.

## Get one plan item

```http
GET /api/users/{userId}/trips/{tripId}/days/{dayId}/plan-items/{planItemId}
```

## Update a plan item

```http
PUT /api/users/{userId}/trips/{tripId}/days/{dayId}/plan-items/{planItemId}
```

## Delete a plan item

```http
DELETE /api/users/{userId}/trips/{tripId}/days/{dayId}/plan-items/{planItemId}
```

Success:

```text
204 No Content
```

---

# Error response

All API errors use this general format:

```json
{
  "timestamp": "2026-09-25T18:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Request validation failed",
  "path": "/api/users/1/trips",
  "fieldErrors": {
    "name": "Trip name is required"
  }
}
```

Common status codes:

| Status | Meaning |
|---:|---|
| 200 | Request completed successfully |
| 201 | Resource created successfully |
| 204 | Resource deleted successfully |
| 400 | Invalid request or business rule violation |
| 404 | User, Trip, TripDay, POI, or PlanItem not found |
| 409 | Database conflict |
| 500 | Unexpected server error |

---

# Local frontend connection

Backend:

```text
http://localhost:8080
```

Allowed frontend origins:

```text
http://localhost:5173
http://localhost:3000
```

Example:

```javascript
const response = await fetch(
  "http://localhost:8080/api/users/1/trips"
);

const trips = await response.json();
```