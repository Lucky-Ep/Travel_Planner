package com.travelplanner.controller;

import com.travelplanner.entity.Trip;
import com.travelplanner.entity.TripDay;
import com.travelplanner.entity.User;
import com.travelplanner.repository.TripDayRepository;
import com.travelplanner.repository.TripRepository;
import com.travelplanner.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class TripDayControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private TripDayRepository tripDayRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .build();
    }

    @Test
    void createTripDayReturnsCreatedDay() throws Exception {
        User user = createUser(
                "create.day@example.com",
                "Create Day User"
        );

        Trip trip = createTrip(user);

        String requestBody = """
                {
                  "dayIndex": 0,
                  "date": "2026-10-01"
                }
                """;

        mockMvc.perform(
                        post(
                                "/api/users/{userId}/trips/{tripId}/days",
                                user.getId(),
                                trip.getId()
                        )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.tripId").value(trip.getId()))
                .andExpect(jsonPath("$.dayIndex").value(0))
                .andExpect(jsonPath("$.date").value("2026-10-01"));
    }

    @Test
    void getTripDaysReturnsDaysInDayIndexOrder()
            throws Exception {
        User user = createUser(
                "day.list@example.com",
                "Day List User"
        );

        Trip trip = createTrip(user);

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

        mockMvc.perform(
                        get(
                                "/api/users/{userId}/trips/{tripId}/days",
                                user.getId(),
                                trip.getId()
                        )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].dayIndex").value(0))
                .andExpect(jsonPath("$[1].dayIndex").value(1))
                .andExpect(jsonPath("$[2].dayIndex").value(2));
    }

    @Test
    void createTripDayRejectsDateThatDoesNotMatchDayIndex()
            throws Exception {
        User user = createUser(
                "invalid.day.date@example.com",
                "Invalid Day User"
        );

        Trip trip = createTrip(user);

        String requestBody = """
                {
                  "dayIndex": 1,
                  "date": "2026-10-01"
                }
                """;

        mockMvc.perform(
                        post(
                                "/api/users/{userId}/trips/{tripId}/days",
                                user.getId(),
                                trip.getId()
                        )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value(
                                "Trip day date must match its day index"
                        ));
    }

    @Test
    void updateTripDayReturnsUpdatedDay() throws Exception {
        User user = createUser(
                "update.day@example.com",
                "Update Day User"
        );

        Trip trip = createTrip(user);

        TripDay tripDay = new TripDay(
                trip,
                0,
                LocalDate.of(2026, 10, 1)
        );

        tripDay = tripDayRepository.save(tripDay);

        String requestBody = """
                {
                  "dayIndex": 1,
                  "date": "2026-10-02"
                }
                """;

        mockMvc.perform(
                        put(
                                "/api/users/{userId}/trips/{tripId}"
                                        + "/days/{dayId}",
                                user.getId(),
                                trip.getId(),
                                tripDay.getId()
                        )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dayIndex").value(1))
                .andExpect(jsonPath("$.date").value("2026-10-02"));
    }

    @Test
    void deleteTripDayRemovesDay() throws Exception {
        User user = createUser(
                "delete.day@example.com",
                "Delete Day User"
        );

        Trip trip = createTrip(user);

        TripDay tripDay = new TripDay(
                trip,
                0,
                LocalDate.of(2026, 10, 1)
        );

        tripDay = tripDayRepository.save(tripDay);
        Long dayId = tripDay.getId();

        mockMvc.perform(
                        delete(
                                "/api/users/{userId}/trips/{tripId}"
                                        + "/days/{dayId}",
                                user.getId(),
                                trip.getId(),
                                dayId
                        )
                )
                .andExpect(status().isNoContent());

        assertFalse(tripDayRepository.existsById(dayId));
    }

    @Test
    void getTripDaysReturnsNotFoundForWrongUser()
            throws Exception {
        User owner = createUser(
                "day.owner@example.com",
                "Day Owner"
        );

        User otherUser = createUser(
                "day.other@example.com",
                "Other User"
        );

        Trip trip = createTrip(owner);

        mockMvc.perform(
                        get(
                                "/api/users/{userId}/trips/{tripId}/days",
                                otherUser.getId(),
                                trip.getId()
                        )
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    private User createUser(
            String email,
            String name
    ) {
        User user = new User(
                email,
                "hashed-password",
                name
        );

        return userRepository.save(user);
    }

    private Trip createTrip(User user) {
        Trip trip = new Trip(
                user,
                "California Trip",
                "San Francisco",
                "US",
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 3)
        );

        return tripRepository.save(trip);
    }
}