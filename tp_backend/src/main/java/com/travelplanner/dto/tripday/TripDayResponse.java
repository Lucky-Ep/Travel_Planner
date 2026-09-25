package com.travelplanner.dto.tripday;

import java.time.LocalDate;

public class TripDayResponse {

    private final Long id;
    private final Long tripId;
    private final Integer dayIndex;
    private final LocalDate date;

    public TripDayResponse(
            Long id,
            Long tripId,
            Integer dayIndex,
            LocalDate date
    ) {
        this.id = id;
        this.tripId = tripId;
        this.dayIndex = dayIndex;
        this.date = date;
    }

    public Long getId() {
        return id;
    }

    public Long getTripId() {
        return tripId;
    }

    public Integer getDayIndex() {
        return dayIndex;
    }

    public LocalDate getDate() {
        return date;
    }
}