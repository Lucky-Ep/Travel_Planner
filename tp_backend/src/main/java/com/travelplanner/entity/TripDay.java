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
                        name = "uk_trip_day_number",
                        columnNames = {"trip_id", "day_number"}
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

    @Min(1)
    @Max(15)
    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    @Column(nullable = false)
    private LocalDate date;

    public TripDay() {
    }

    public TripDay(Trip trip, Integer dayNumber, LocalDate date) {
        this.trip = trip;
        this.dayNumber = dayNumber;
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

    public Integer getDayNumber() {
        return dayNumber;
    }

    public void setDayNumber(Integer dayNumber) {
        this.dayNumber = dayNumber;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }
}