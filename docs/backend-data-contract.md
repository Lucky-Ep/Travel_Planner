# Backend Data Contract Draft

This document is a draft for backend and frontend review.

## Core entities

- User
- Trip
- TripDay
- POI
- PlanItem

## Relationships

- One User has many Trips.
- One Trip has many TripDays.
- One TripDay has many PlanItems.
- One POI can be referenced by many PlanItems.

## Shared field names

- userId
- tripId
- dayId
- poiId
- planItemId
- externalPlaceId
- dayNumber
- visitOrder
- visitTime
- durationMinutes
- reminderMinutesBefore
- latitude
- longitude

## Date and time formats

- Date: YYYY-MM-DD
- Time: HH:mm

## Ordered waypoint data for Route Planning

Route Planning needs the following fields:

- planItemId
- poiId
- name
- visitOrder
- latitude
- longitude

Suggested query:

```java
List<PlanItem> findByTripDayIdOrderByVisitOrderAsc(Long dayId);