package com.travelplanner.repository;

import com.travelplanner.entity.TripDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TripDayRepository extends JpaRepository<TripDay, Long> {

    List<TripDay> findByTripIdOrderByDayNumberAsc(Long tripId);

    Optional<TripDay> findByIdAndTripId(Long dayId, Long tripId);

    void deleteByTripId(Long tripId);
}