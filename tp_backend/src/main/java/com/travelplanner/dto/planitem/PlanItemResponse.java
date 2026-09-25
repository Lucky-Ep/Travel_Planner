package com.travelplanner.dto.planitem;

import java.time.LocalTime;

public class PlanItemResponse {

    private final Long id;
    private final Long dayId;

    private final Long poiId;
    private final String poiName;
    private final String poiAddress;
    private final String poiCategory;
    private final Double latitude;
    private final Double longitude;
    private final Double rating;
    private final String imageUrl;

    private final Integer visitOrder;
    private final LocalTime scheduledTime;
    private final Integer durationMinutes;
    private final String note;
    private final Integer reminderMinutesBefore;

    public PlanItemResponse(
            Long id,
            Long dayId,
            Long poiId,
            String poiName,
            String poiAddress,
            String poiCategory,
            Double latitude,
            Double longitude,
            Double rating,
            String imageUrl,
            Integer visitOrder,
            LocalTime scheduledTime,
            Integer durationMinutes,
            String note,
            Integer reminderMinutesBefore
    ) {
        this.id = id;
        this.dayId = dayId;
        this.poiId = poiId;
        this.poiName = poiName;
        this.poiAddress = poiAddress;
        this.poiCategory = poiCategory;
        this.latitude = latitude;
        this.longitude = longitude;
        this.rating = rating;
        this.imageUrl = imageUrl;
        this.visitOrder = visitOrder;
        this.scheduledTime = scheduledTime;
        this.durationMinutes = durationMinutes;
        this.note = note;
        this.reminderMinutesBefore =
                reminderMinutesBefore;
    }

    public Long getId() {
        return id;
    }

    public Long getDayId() {
        return dayId;
    }

    public Long getPoiId() {
        return poiId;
    }

    public String getPoiName() {
        return poiName;
    }

    public String getPoiAddress() {
        return poiAddress;
    }

    public String getPoiCategory() {
        return poiCategory;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public Double getRating() {
        return rating;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public Integer getVisitOrder() {
        return visitOrder;
    }

    public LocalTime getScheduledTime() {
        return scheduledTime;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public String getNote() {
        return note;
    }

    public Integer getReminderMinutesBefore() {
        return reminderMinutesBefore;
    }
}