package com.travelplanner.controller;

import com.travelplanner.entity.Trip;
import com.travelplanner.entity.User;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class TripControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripRepository tripRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .build();
    }

    @Test
    void createTripReturnsCreatedTrip() throws Exception {
        User user = createUser(
                "create.trip@example.com",
                "Create Trip User"
        );

        String requestBody = """
                {
                  "name": "San Francisco Trip",
                  "city": "San Francisco",
                  "countryCode": "us",
                  "startDate": "2026-10-01",
                  "endDate": "2026-10-03"
                }
                """;

        mockMvc.perform(
                        post("/api/users/{userId}/trips", user.getId())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.userId").value(user.getId()))
                .andExpect(jsonPath("$.name").value("San Francisco Trip"))
                .andExpect(jsonPath("$.city").value("San Francisco"))
                .andExpect(jsonPath("$.countryCode").value("US"))
                .andExpect(jsonPath("$.startDate").value("2026-10-01"))
                .andExpect(jsonPath("$.endDate").value("2026-10-03"));

        List<Trip> savedTrips =
                tripRepository.findByUserIdOrderByStartDateDesc(
                        user.getId()
                );

        assertEquals(1, savedTrips.size());
        assertEquals("San Francisco Trip", savedTrips.get(0).getName());
        assertEquals("US", savedTrips.get(0).getCountryCode());
    }

    @Test
    void getTripsReturnsOnlyUserTripsInStartDateDescendingOrder()
            throws Exception {
        User firstUser = createUser(
                "trip.list@example.com",
                "Trip List User"
        );

        User secondUser = createUser(
                "other.trip.list@example.com",
                "Other Trip User"
        );

        Trip earlierTrip = new Trip(
                firstUser,
                "Seattle Trip",
                "Seattle",
                "US",
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 3)
        );

        Trip laterTrip = new Trip(
                firstUser,
                "New York Trip",
                "New York",
                "US",
                LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 5)
        );

        Trip otherUserTrip = new Trip(
                secondUser,
                "Chicago Trip",
                "Chicago",
                "US",
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 3)
        );

        tripRepository.saveAll(List.of(
                earlierTrip,
                laterTrip,
                otherUserTrip
        ));

        mockMvc.perform(
                        get("/api/users/{userId}/trips", firstUser.getId())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("New York Trip"))
                .andExpect(jsonPath("$[1].name").value("Seattle Trip"));
    }

    @Test
    void getTripReturnsNotFoundForWrongUser() throws Exception {
        User owner = createUser(
                "trip.owner@example.com",
                "Trip Owner"
        );

        User otherUser = createUser(
                "trip.other@example.com",
                "Other User"
        );

        Trip trip = new Trip(
                owner,
                "Owner Trip",
                "Oakland",
                "US",
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 2)
        );

        trip = tripRepository.save(trip);

        mockMvc.perform(
                        get(
                                "/api/users/{userId}/trips/{tripId}",
                                otherUser.getId(),
                                trip.getId()
                        )
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(
                        "Trip not found with id "
                                + trip.getId()
                                + " for user "
                                + otherUser.getId()
                ));
    }

    @Test
    void updateTripReturnsUpdatedTrip() throws Exception {
        User user = createUser(
                "update.trip@example.com",
                "Update Trip User"
        );

        Trip trip = new Trip(
                user,
                "Old Trip Name",
                "Oakland",
                "US",
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 2)
        );

        trip = tripRepository.save(trip);

        String requestBody = """
                {
                  "name": "Updated Los Angeles Trip",
                  "city": "Los Angeles",
                  "countryCode": "us",
                  "startDate": "2026-11-01",
                  "endDate": "2026-11-05"
                }
                """;

        mockMvc.perform(
                        put(
                                "/api/users/{userId}/trips/{tripId}",
                                user.getId(),
                                trip.getId()
                        )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name")
                        .value("Updated Los Angeles Trip"))
                .andExpect(jsonPath("$.city").value("Los Angeles"))
                .andExpect(jsonPath("$.countryCode").value("US"))
                .andExpect(jsonPath("$.startDate").value("2026-11-01"))
                .andExpect(jsonPath("$.endDate").value("2026-11-05"));
    }

    @Test
    void deleteTripRemovesTrip() throws Exception {
        User user = createUser(
                "delete.trip@example.com",
                "Delete Trip User"
        );

        Trip trip = new Trip(
                user,
                "Trip To Delete",
                "Portland",
                "US",
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 3)
        );

        trip = tripRepository.save(trip);
        Long tripId = trip.getId();

        mockMvc.perform(
                        delete(
                                "/api/users/{userId}/trips/{tripId}",
                                user.getId(),
                                tripId
                        )
                )
                .andExpect(status().isNoContent());

        assertFalse(tripRepository.existsById(tripId));
    }

    @Test
    void createTripReturnsBadRequestForInvalidFields()
            throws Exception {
        User user = createUser(
                "invalid.fields@example.com",
                "Invalid Fields User"
        );

        String requestBody = """
                {
                  "name": "",
                  "city": "",
                  "countryCode": "USA",
                  "startDate": "2026-10-01",
                  "endDate": "2026-10-03"
                }
                """;

        mockMvc.perform(
                        post("/api/users/{userId}/trips", user.getId())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message")
                        .value("Request validation failed"))
                .andExpect(jsonPath("$.fieldErrors.name")
                        .value("Trip name is required"))
                .andExpect(jsonPath("$.fieldErrors.city")
                        .value("City is required"))
                .andExpect(jsonPath("$.fieldErrors.countryCode")
                        .value(
                                "Country code must contain exactly two letters"
                        ));
    }

    @Test
    void createTripReturnsBadRequestWhenEndDateIsBeforeStartDate()
            throws Exception {
        User user = createUser(
                "invalid.dates@example.com",
                "Invalid Dates User"
        );

        String requestBody = """
                {
                  "name": "Invalid Date Trip",
                  "city": "Oakland",
                  "countryCode": "US",
                  "startDate": "2026-10-05",
                  "endDate": "2026-10-01"
                }
                """;

        mockMvc.perform(
                        post("/api/users/{userId}/trips", user.getId())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message")
                        .value(
                                "End date must not be before start date"
                        ));
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
}