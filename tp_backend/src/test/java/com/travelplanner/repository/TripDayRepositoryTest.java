package com.travelplanner.repository;

import com.travelplanner.entity.Trip;
import com.travelplanner.entity.TripDay;
import com.travelplanner.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class TripDayRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private TripDayRepository tripDayRepository;

    @Test
    void findByTripIdOrderByDayIndexAscReturnsDaysInCorrectOrder() {
        User user = new User(
                "tripday.user@example.com",
                "hashed-password",
                "TripDay User"
        );

        user = userRepository.save(user);

        Trip trip = new Trip(
                user,
                "California Trip",
                "San Francisco",
                "US",
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 3)
        );

        trip = tripRepository.save(trip);

        TripDay thirdDay = new TripDay(
                trip,
                2,
                LocalDate.of(2026, 10, 3)
        );

        TripDay firstDay = new TripDay(
                trip,
                0,
                LocalDate.of(2026, 10, 1)
        );

        TripDay secondDay = new TripDay(
                trip,
                1,
                LocalDate.of(2026, 10, 2)
        );

        tripDayRepository.saveAll(List.of(
                thirdDay,
                firstDay,
                secondDay
        ));

        List<TripDay> result =
                tripDayRepository.findByTripIdOrderByDayIndexAsc(trip.getId());

        assertEquals(3, result.size());

        assertEquals(0, result.get(0).getDayIndex());
        assertEquals(1, result.get(1).getDayIndex());
        assertEquals(2, result.get(2).getDayIndex());

        assertEquals(
                LocalDate.of(2026, 10, 1),
                result.get(0).getDate()
        );

        assertEquals(
                LocalDate.of(2026, 10, 2),
                result.get(1).getDate()
        );

        assertEquals(
                LocalDate.of(2026, 10, 3),
                result.get(2).getDate()
        );
    }

    @Test
    void findByIdAndTripIdReturnsDayOnlyForItsTrip() {
        User user = new User(
                "tripday.owner@example.com",
                "hashed-password",
                "TripDay Owner"
        );

        user = userRepository.save(user);

        Trip firstTrip = new Trip(
                user,
                "First Trip",
                "Seattle",
                "US",
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 3)
        );

        Trip secondTrip = new Trip(
                user,
                "Second Trip",
                "Portland",
                "US",
                LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 3)
        );

        firstTrip = tripRepository.save(firstTrip);
        secondTrip = tripRepository.save(secondTrip);

        TripDay tripDay = new TripDay(
                firstTrip,
                0,
                LocalDate.of(2026, 11, 1)
        );

        tripDay = tripDayRepository.save(tripDay);

        Optional<TripDay> correctTripResult =
                tripDayRepository.findByIdAndTripId(
                        tripDay.getId(),
                        firstTrip.getId()
                );

        Optional<TripDay> wrongTripResult =
                tripDayRepository.findByIdAndTripId(
                        tripDay.getId(),
                        secondTrip.getId()
                );

        assertTrue(correctTripResult.isPresent());

        assertEquals(
                0,
                correctTripResult.get().getDayIndex()
        );

        assertTrue(wrongTripResult.isEmpty());
    }
}