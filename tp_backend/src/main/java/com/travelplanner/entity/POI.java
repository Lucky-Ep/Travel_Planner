package com.travelplanner.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "pois",
        indexes = {
                @Index(name = "idx_poi_city", columnList = "city"),
                @Index(name = "idx_poi_category", columnList = "category")
        }
)
public class POI {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_place_id", nullable = false, unique = true)
    private String externalPlaceId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String address;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    @Column(length = 100)
    private String category;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private Double rating;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public POI() {
    }

    public POI(
            String externalPlaceId,
            String name,
            String address,
            String city,
            String countryCode,
            String category,
            Double latitude,
            Double longitude,
            Double rating
    ) {
        this.externalPlaceId = externalPlaceId;
        this.name = name;
        this.address = address;
        this.city = city;
        this.countryCode = countryCode;
        this.category = category;
        this.latitude = latitude;
        this.longitude = longitude;
        this.rating = rating;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getExternalPlaceId() {
        return externalPlaceId;
    }

    public void setExternalPlaceId(String externalPlaceId) {
        this.externalPlaceId = externalPlaceId;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}