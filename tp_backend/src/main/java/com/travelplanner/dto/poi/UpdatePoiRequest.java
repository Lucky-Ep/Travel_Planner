package com.travelplanner.dto.poi;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UpdatePoiRequest {

    @NotBlank(message = "POI name is required")
    @Size(
            max = 200,
            message = "POI name must not exceed 200 characters"
    )
    private String name;

    @Size(
            max = 500,
            message = "Address must not exceed 500 characters"
    )
    private String address;

    @NotBlank(message = "City is required")
    @Size(
            max = 100,
            message = "City must not exceed 100 characters"
    )
    private String city;

    @NotBlank(message = "Country code is required")
    @Pattern(
            regexp = "^[A-Za-z]{2}$",
            message = "Country code must contain exactly two letters"
    )
    private String countryCode;

    @Size(
            max = 100,
            message = "Category must not exceed 100 characters"
    )
    private String category;

    @NotNull(message = "Latitude is required")
    @DecimalMin(
            value = "-90.0",
            message = "Latitude must be at least -90"
    )
    @DecimalMax(
            value = "90.0",
            message = "Latitude must not exceed 90"
    )
    private Double latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(
            value = "-180.0",
            message = "Longitude must be at least -180"
    )
    @DecimalMax(
            value = "180.0",
            message = "Longitude must not exceed 180"
    )
    private Double longitude;

    @DecimalMin(
            value = "0.0",
            message = "Rating must be at least 0"
    )
    @DecimalMax(
            value = "5.0",
            message = "Rating must not exceed 5"
    )
    private Double rating;

    @Size(
            max = 1000,
            message = "Image URL must not exceed 1000 characters"
    )
    private String imageUrl;

    public UpdatePoiRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}