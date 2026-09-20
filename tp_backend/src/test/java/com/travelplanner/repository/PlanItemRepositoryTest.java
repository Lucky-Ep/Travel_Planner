package com.travelplanner.repository;

import com.travelplanner.entity.POI;
import com.travelplanner.entity.PlanItem;
import com.travelplanner.entity.Trip;
import com.travelplanner.entity.TripDay;
import com.travelplanner.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class PlanItemRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private TripDayRepository tripDayRepository;

    @Autowired
    private POIRepository poiRepository;

    @Autowired
    private PlanItemRepository planItemRepository;

    @Test
    void findByTripDayIdOrderByVisitOrderAscReturnsItemsInCorrectOrder() {
        User user = new User(
                "planitem.user@example.com",
                "hashed-password",
                "PlanItem User"
        );

        user = userRepository.save(user);

        Trip trip = new Trip(
                user,
                "San Francisco Trip",
                "San Francisco",
                "US",
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 3)
        );

        trip = tripRepository.save(trip);

        TripDay tripDay = new TripDay(
                trip,
                0,
                LocalDate.of(2026, 10, 1)
        );

        tripDay = tripDayRepository.save(tripDay);

        POI goldenGateBridge = new POI(
                "planitem-golden-gate",
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
                "planitem-ferry-building",
                "Ferry Building",
                "1 Ferry Building",
                "San Francisco",
                "US",
                "Market",
                37.7955,
                -122.3937,
                4.6
        );

        POI palaceOfFineArts = new POI(
                "planitem-palace-fine-arts",
                "Palace of Fine Arts",
                "3601 Lyon Street",
                "San Francisco",
                "US",
                "Attraction",
                37.8029,
                -122.4484,
                4.7
        );

        poiRepository.saveAll(List.of(
                goldenGateBridge,
                ferryBuilding,
                palaceOfFineArts
        ));

        PlanItem thirdItem = new PlanItem(
                tripDay,
                palaceOfFineArts,
                3,
                LocalTime.of(15, 0),
                90,
                "Visit in the afternoon",
                30
        );

        PlanItem firstItem = new PlanItem(
                tripDay,
                goldenGateBridge,
                1,
                LocalTime.of(9, 0),
                120,
                "Start the day here",
                30
        );

        PlanItem secondItem = new PlanItem(
                tripDay,
                ferryBuilding,
                2,
                LocalTime.of(12, 0),
                60,
                "Lunch stop",
                15
        );

        planItemRepository.saveAll(List.of(
                thirdItem,
                firstItem,
                secondItem
        ));

        List<PlanItem> result =
                planItemRepository.findByTripDayIdOrderByVisitOrderAsc(
                        tripDay.getId()
                );

        assertEquals(3, result.size());

        assertEquals(1, result.get(0).getVisitOrder());
        assertEquals(2, result.get(1).getVisitOrder());
        assertEquals(3, result.get(2).getVisitOrder());

        assertEquals(
                "Golden Gate Bridge",
                result.get(0).getPoi().getName()
        );

        assertEquals(
                "Ferry Building",
                result.get(1).getPoi().getName()
        );

        assertEquals(
                "Palace of Fine Arts",
                result.get(2).getPoi().getName()
        );

        assertEquals(
                LocalTime.of(9, 0),
                result.get(0).getScheduledTime()
        );

        assertEquals(
                30,
                result.get(0).getReminderMinutesBefore()
        );
    }

    @Test
    void findByIdAndTripDayIdReturnsItemOnlyForItsDay() {
        User user = new User(
                "planitem.owner@example.com",
                "hashed-password",
                "PlanItem Owner"
        );

        user = userRepository.save(user);

        Trip trip = new Trip(
                user,
                "California Trip",
                "San Francisco",
                "US",
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 2)
        );

        trip = tripRepository.save(trip);

        TripDay firstDay = new TripDay(
                trip,
                0,
                LocalDate.of(2026, 11, 1)
        );

        TripDay secondDay = new TripDay(
                trip,
                1,
                LocalDate.of(2026, 11, 2)
        );

        firstDay = tripDayRepository.save(firstDay);
        secondDay = tripDayRepository.save(secondDay);

        POI poi = new POI(
                "planitem-day-ownership-poi",
                "Exploratorium",
                "Pier 15",
                "San Francisco",
                "US",
                "Museum",
                37.8017,
                -122.3973,
                4.7
        );

        poi = poiRepository.save(poi);

        PlanItem planItem = new PlanItem(
                firstDay,
                poi,
                1,
                LocalTime.of(10, 0),
                120,
                "Science museum",
                30
        );

        planItem = planItemRepository.save(planItem);

        Optional<PlanItem> correctDayResult =
                planItemRepository.findByIdAndTripDayId(
                        planItem.getId(),
                        firstDay.getId()
                );

        Optional<PlanItem> wrongDayResult =
                planItemRepository.findByIdAndTripDayId(
                        planItem.getId(),
                        secondDay.getId()
                );

        assertTrue(correctDayResult.isPresent());

        assertEquals(
                "Exploratorium",
                correctDayResult.get().getPoi().getName()
        );

        assertTrue(wrongDayResult.isEmpty());
    }
}