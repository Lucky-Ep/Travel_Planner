package com.travelplanner.repository;

import com.travelplanner.entity.PlanItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanItemRepository
        extends JpaRepository<PlanItem, Long> {

    List<PlanItem> findByTripDayIdOrderByVisitOrderAsc(
            Long dayId
    );

    Optional<PlanItem> findByIdAndTripDayId(
            Long planItemId,
            Long dayId
    );

    boolean existsByPoiId(Long poiId);

    void deleteByTripDayId(Long dayId);
}