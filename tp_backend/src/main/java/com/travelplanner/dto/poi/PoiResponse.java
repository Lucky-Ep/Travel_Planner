package com.travelplanner.dto.poi;

import java.time.LocalDateTime;

public class PoiResponse {

    private final Long id;
    private final String externalPlaceId;
    private final String name;
    private final String address;
    private final String city;
    private final String countryCode;
    private final String category;
    private final Double latitude;
    private final Double longitude;
    private final Double rating;
    private final String imageUrl;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public PoiResponse(
            Long id,
            String externalPlaceId,
            String name,
            String address,
            String city,
            String countryCode,
            String category,
            Double latitude,
            Double longitude,
            Double rating,
            String imageUrl,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        this.id = id;
        this.externalPlaceId = externalPlaceId;
        this.name = name;
        this.address = address;
        this.city = city;
        this.countryCode = countryCode;
        this.category = category;
        this.latitude = latitude;
        this.longitude = longitude;
        this.rating = rating;
        this.imageUrl = imageUrl;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public String getExternalPlaceId() {
        return externalPlaceId;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public String getCity() {
        return city;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public String getCategory() {
        return category;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}