package com.travelplanner.repository;

import com.travelplanner.entity.POI;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface POIRepository extends JpaRepository<POI, Long> {

    Optional<POI> findByExternalPlaceId(String externalPlaceId);

    boolean existsByExternalPlaceId(String externalPlaceId);

    List<POI> findByCityIgnoreCase(String city);

    List<POI> findByCityIgnoreCaseAndCategoryIgnoreCase(
            String city,
            String category
    );
}