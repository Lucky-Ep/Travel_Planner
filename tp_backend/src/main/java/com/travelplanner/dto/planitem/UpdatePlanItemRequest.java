package com.travelplanner.dto.planitem;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public class UpdatePlanItemRequest {

    @NotNull(message = "POI id is required")
    @Positive(message = "POI id must be positive")
    private Long poiId;

    @NotNull(message = "Visit order is required")
    @Min(value = 1, message = "Visit order must be at least 1")
    private Integer visitOrder;

    private LocalTime scheduledTime;

    @Min(
            value = 1,
            message = "Duration must be at least 1 minute"
    )
    private Integer durationMinutes;

    @Size(
            max = 1000,
            message = "Note must not exceed 1000 characters"
    )
    private String note;

    @Min(
            value = 0,
            message = "Reminder minutes must not be negative"
    )
    private Integer reminderMinutesBefore;

    public UpdatePlanItemRequest() {
    }

    public Long getPoiId() {
        return poiId;
    }

    public void setPoiId(Long poiId) {
        this.poiId = poiId;
    }

    public Integer getVisitOrder() {
        return visitOrder;
    }

    public void setVisitOrder(Integer visitOrder) {
        this.visitOrder = visitOrder;
    }

    public LocalTime getScheduledTime() {
        return scheduledTime;
    }

    public void setScheduledTime(LocalTime scheduledTime) {
        this.scheduledTime = scheduledTime;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Integer getReminderMinutesBefore() {
        return reminderMinutesBefore;
    }

    public void setReminderMinutesBefore(
            Integer reminderMinutesBefore
    ) {
        this.reminderMinutesBefore =
                reminderMinutesBefore;
    }
}