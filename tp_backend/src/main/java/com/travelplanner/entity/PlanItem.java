package com.travelplanner.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(
        name = "plan_items",
        indexes = {
                @Index(
                        name = "idx_plan_item_day_order",
                        columnList = "trip_day_id, visit_order"
                )
        }
)
public class PlanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_day_id", nullable = false)
    private TripDay tripDay;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poi_id", nullable = false)
    private POI poi;

    @Min(1)
    @Column(name = "visit_order", nullable = false)
    private Integer visitOrder;

    @Column(name = "scheduled_time")
    private LocalTime scheduledTime;

    @Min(1)
    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(length = 1000)
    private String note;

    @Min(0)
    @Column(name = "reminder_minutes_before")
    private Integer reminderMinutesBefore;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PlanItem() {
    }

    public PlanItem(
            TripDay tripDay,
            POI poi,
            Integer visitOrder,
            LocalTime scheduledTime,
            Integer durationMinutes,
            String note,
            Integer reminderMinutesBefore
    ) {
        this.tripDay = tripDay;
        this.poi = poi;
        this.visitOrder = visitOrder;
        this.scheduledTime = scheduledTime;
        this.durationMinutes = durationMinutes;
        this.note = note;
        this.reminderMinutesBefore = reminderMinutesBefore;
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

    public TripDay getTripDay() {
        return tripDay;
    }

    public void setTripDay(TripDay tripDay) {
        this.tripDay = tripDay;
    }

    public POI getPoi() {
        return poi;
    }

    public void setPoi(POI poi) {
        this.poi = poi;
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

    public void setReminderMinutesBefore(Integer reminderMinutesBefore) {
        this.reminderMinutesBefore = reminderMinutesBefore;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}