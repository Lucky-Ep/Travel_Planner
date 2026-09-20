package com.travelplanner.repository;

import com.travelplanner.entity.Trip;
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
class TripRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripRepository tripRepository;

    @Test
    void findByUserIdOrderByStartDateDescReturnsOnlyUserTripsInCorrectOrder() {
        User firstUser = new User(
                "first.user@example.com",
                "hashed-password-1",
                "First User"
        );

        User secondUser = new User(
                "second.user@example.com",
                "hashed-password-2",
                "Second User"
        );

        firstUser = userRepository.save(firstUser);
        secondUser = userRepository.save(secondUser);

        Trip earlierTrip = new Trip(
                firstUser,
                "Seattle Trip",
                "Seattle",
                "US",
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 5)
        );

        Trip laterTrip = new Trip(
                firstUser,
                "New York Trip",
                "New York",
                "US",
                LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 7)
        );

        Trip anotherUserTrip = new Trip(
                secondUser,
                "Chicago Trip",
                "Chicago",
                "US",
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 4)
        );

        tripRepository.saveAll(List.of(
                earlierTrip,
                laterTrip,
                anotherUserTrip
        ));

        List<Trip> result =
                tripRepository.findByUserIdOrderByStartDateDesc(firstUser.getId());

        assertEquals(2, result.size());

        assertEquals(
                "New York Trip",
                result.get(0).getName()
        );

        assertEquals(
                "Seattle Trip",
                result.get(1).getName()
        );

        assertEquals(
                firstUser.getId(),
                result.get(0).getUser().getId()
        );

        assertEquals(
                firstUser.getId(),
                result.get(1).getUser().getId()
        );
    }

    @Test
    void findByIdAndUserIdReturnsTripOnlyForItsOwner() {
        User owner = new User(
                "owner@example.com",
                "hashed-password-1",
                "Trip Owner"
        );

        User otherUser = new User(
                "other.user@example.com",
                "hashed-password-2",
                "Other User"
        );

        owner = userRepository.save(owner);
        otherUser = userRepository.save(otherUser);

        Trip trip = new Trip(
                owner,
                "San Francisco Trip",
                "San Francisco",
                "US",
                LocalDate.of(2026, 9, 20),
                LocalDate.of(2026, 9, 23)
        );

        trip = tripRepository.save(trip);

        Optional<Trip> ownerResult =
                tripRepository.findByIdAndUserId(
                        trip.getId(),
                        owner.getId()
                );

        Optional<Trip> otherUserResult =
                tripRepository.findByIdAndUserId(
                        trip.getId(),
                        otherUser.getId()
                );

        assertTrue(ownerResult.isPresent());

        assertEquals(
                "San Francisco Trip",
                ownerResult.get().getName()
        );

        assertTrue(otherUserResult.isEmpty());
    }
}