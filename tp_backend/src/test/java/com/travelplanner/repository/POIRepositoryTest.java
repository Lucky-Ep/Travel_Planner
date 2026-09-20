package com.travelplanner.repository;

import com.travelplanner.entity.POI;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class POIRepositoryTest {

    @Autowired
    private POIRepository poiRepository;

    @Test
    void findByExternalPlaceIdReturnsMatchingPoi() {
        POI goldenGateBridge = new POI(
                "place-golden-gate",
                "Golden Gate Bridge",
                "Golden Gate Bridge",
                "San Francisco",
                "US",
                "Attraction",
                37.8199,
                -122.4783,
                4.8
        );

        goldenGateBridge.setImageUrl(
                "https://example.com/golden-gate-bridge.jpg"
        );

        poiRepository.save(goldenGateBridge);

        Optional<POI> result =
                poiRepository.findByExternalPlaceId("place-golden-gate");

        assertTrue(result.isPresent());

        assertEquals(
                "Golden Gate Bridge",
                result.get().getName()
        );

        assertEquals(
                "https://example.com/golden-gate-bridge.jpg",
                result.get().getImageUrl()
        );
    }

    @Test
    void findByCityIgnoreCaseReturnsPoisFromMatchingCity() {
        POI goldenGateBridge = new POI(
                "place-golden-gate-city-test",
                "Golden Gate Bridge",
                "Golden Gate Bridge",
                "San Francisco",
                "US",
                "Attraction",
                37.8199,
                -122.4783,
                4.8
        );

        POI ferryBuilding = new POI(
                "place-ferry-building",
                "Ferry Building",
                "1 Ferry Building",
                "San Francisco",
                "US",
                "Market",
                37.7955,
                -122.3937,
                4.6
        );

        POI spaceNeedle = new POI(
                "place-space-needle",
                "Space Needle",
                "400 Broad Street",
                "Seattle",
                "US",
                "Attraction",
                47.6205,
                -122.3493,
                4.6
        );

        poiRepository.saveAll(List.of(
                goldenGateBridge,
                ferryBuilding,
                spaceNeedle
        ));

        List<POI> result =
                poiRepository.findByCityIgnoreCase("san francisco");

        assertEquals(2, result.size());

        assertTrue(
                result.stream()
                        .allMatch(poi -> poi.getCity().equals("San Francisco"))
        );
    }

    @Test
    void findByCityAndCategoryIgnoreCaseReturnsMatchingPois() {
        POI goldenGateBridge = new POI(
                "place-golden-gate-category-test",
                "Golden Gate Bridge",
                "Golden Gate Bridge",
                "San Francisco",
                "US",
                "Attraction",
                37.8199,
                -122.4783,
                4.8
        );

        POI ferryBuilding = new POI(
                "place-ferry-building-category-test",
                "Ferry Building",
                "1 Ferry Building",
                "San Francisco",
                "US",
                "Market",
                37.7955,
                -122.3937,
                4.6
        );

        POI spaceNeedle = new POI(
                "place-space-needle-category-test",
                "Space Needle",
                "400 Broad Street",
                "Seattle",
                "US",
                "Attraction",
                47.6205,
                -122.3493,
                4.6
        );

        poiRepository.saveAll(List.of(
                goldenGateBridge,
                ferryBuilding,
                spaceNeedle
        ));

        List<POI> result =
                poiRepository.findByCityIgnoreCaseAndCategoryIgnoreCase(
                        "SAN FRANCISCO",
                        "ATTRACTION"
                );

        assertEquals(1, result.size());

        assertEquals(
                "Golden Gate Bridge",
                result.get(0).getName()
        );
    }
}