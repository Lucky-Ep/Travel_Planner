package com.travelplanner.dto.tripday;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class UpdateTripDayRequest {

    @NotNull(message = "Day index is required")
    @Min(value = 0, message = "Day index must be at least 0")
    @Max(value = 14, message = "Day index must not exceed 14")
    private Integer dayIndex;

    @NotNull(message = "Date is required")
    private LocalDate date;

    public UpdateTripDayRequest() {
    }

    public Integer getDayIndex() {
        return dayIndex;
    }

    public void setDayIndex(Integer dayIndex) {
        this.dayIndex = dayIndex;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }
}