package com.travelplanner.repository;

import com.travelplanner.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findByUserIdOrderByStartDateDesc(Long userId);

    Optional<Trip> findByIdAndUserId(Long tripId, Long userId);
}