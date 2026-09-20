package com.travelplanner.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.LocalDate;

@Entity
@Table(
        name = "trip_days",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_trip_day_index",
                        columnNames = {"trip_id", "day_index"}
                )
        }
)
public class TripDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Min(0)
    @Max(14)
    @Column(name = "day_index", nullable = false)
    private Integer dayIndex;

    @Column(nullable = false)
    private LocalDate date;

    public TripDay() {
    }

    public TripDay(Trip trip, Integer dayIndex, LocalDate date) {
        this.trip = trip;
        this.dayIndex = dayIndex;
        this.date = date;
    }

    public Long getId() {
        return id;
    }

    public Trip getTrip() {
        return trip;
    }

    public void setTrip(Trip trip) {
        this.trip = trip;
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