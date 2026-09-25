package com.travelplanner.controller;

import com.travelplanner.entity.POI;
import com.travelplanner.entity.PlanItem;
import com.travelplanner.entity.Trip;
import com.travelplanner.entity.TripDay;
import com.travelplanner.entity.User;
import com.travelplanner.repository.POIRepository;
import com.travelplanner.repository.PlanItemRepository;
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
import java.time.LocalTime;
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
class PlanItemControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

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

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .build();
    }

    @Test
    void createPlanItemReturnsCreatedItem() throws Exception {
        TestData testData = createTestData(
                "create.planitem@example.com"
        );

        String requestBody = """
                {
                  "poiId": %d,
                  "visitOrder": 1,
                  "scheduledTime": "09:00",
                  "durationMinutes": 120,
                  "note": "Start the day here",
                  "reminderMinutesBefore": 30
                }
                """.formatted(testData.poi().getId());

        mockMvc.perform(
                        post(
                                "/api/users/{userId}/trips/{tripId}"
                                        + "/days/{dayId}/plan-items",
                                testData.user().getId(),
                                testData.trip().getId(),
                                testData.tripDay().getId()
                        )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.dayId")
                        .value(testData.tripDay().getId()))
                .andExpect(jsonPath("$.poiId")
                        .value(testData.poi().getId()))
                .andExpect(jsonPath("$.poiName")
                        .value("Golden Gate Bridge"))
                .andExpect(jsonPath("$.visitOrder").value(1))
                .andExpect(jsonPath("$.durationMinutes").value(120))
                .andExpect(jsonPath("$.reminderMinutesBefore")
                        .value(30));
    }

    @Test
    void getPlanItemsReturnsItemsInVisitOrder()
            throws Exception {
        TestData testData = createTestData(
                "list.planitem@example.com"
        );

        POI secondPoi = createPoi(
                "planitem-ferry-building",
                "Ferry Building"
        );

        PlanItem secondItem = new PlanItem(
                testData.tripDay(),
                secondPoi,
                2,
                LocalTime.of(12, 0),
                60,
                "Lunch",
                15
        );

        PlanItem firstItem = new PlanItem(
                testData.tripDay(),
                testData.poi(),
                1,
                LocalTime.of(9, 0),
                120,
                "First stop",
                30
        );

        planItemRepository.saveAll(List.of(
                secondItem,
                firstItem
        ));

        mockMvc.perform(
                        get(
                                "/api/users/{userId}/trips/{tripId}"
                                        + "/days/{dayId}/plan-items",
                                testData.user().getId(),
                                testData.trip().getId(),
                                testData.tripDay().getId()
                        )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].visitOrder").value(1))
                .andExpect(jsonPath("$[0].poiName")
                        .value("Golden Gate Bridge"))
                .andExpect(jsonPath("$[1].visitOrder").value(2))
                .andExpect(jsonPath("$[1].poiName")
                        .value("Ferry Building"));
    }

    @Test
    void updatePlanItemReturnsUpdatedItem()
            throws Exception {
        TestData testData = createTestData(
                "update.planitem@example.com"
        );

        PlanItem planItem = new PlanItem(
                testData.tripDay(),
                testData.poi(),
                1,
                LocalTime.of(9, 0),
                60,
                "Old note",
                15
        );

        planItem = planItemRepository.save(planItem);

        String requestBody = """
                {
                  "poiId": %d,
                  "visitOrder": 2,
                  "scheduledTime": "10:30",
                  "durationMinutes": 90,
                  "note": "Updated note",
                  "reminderMinutesBefore": 20
                }
                """.formatted(testData.poi().getId());

        mockMvc.perform(
                        put(
                                "/api/users/{userId}/trips/{tripId}"
                                        + "/days/{dayId}"
                                        + "/plan-items/{planItemId}",
                                testData.user().getId(),
                                testData.trip().getId(),
                                testData.tripDay().getId(),
                                planItem.getId()
                        )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visitOrder").value(2))
                .andExpect(jsonPath("$.durationMinutes").value(90))
                .andExpect(jsonPath("$.note")
                        .value("Updated note"))
                .andExpect(jsonPath("$.reminderMinutesBefore")
                        .value(20));
    }

    @Test
    void deletePlanItemRemovesItem() throws Exception {
        TestData testData = createTestData(
                "delete.planitem@example.com"
        );

        PlanItem planItem = new PlanItem(
                testData.tripDay(),
                testData.poi(),
                1,
                LocalTime.of(9, 0),
                60,
                null,
                null
        );

        planItem = planItemRepository.save(planItem);
        Long planItemId = planItem.getId();

        mockMvc.perform(
                        delete(
                                "/api/users/{userId}/trips/{tripId}"
                                        + "/days/{dayId}"
                                        + "/plan-items/{planItemId}",
                                testData.user().getId(),
                                testData.trip().getId(),
                                testData.tripDay().getId(),
                                planItemId
                        )
                )
                .andExpect(status().isNoContent());

        assertFalse(
                planItemRepository.existsById(planItemId)
        );
    }

    @Test
    void createPlanItemRejectsReminderWithoutScheduledTime()
            throws Exception {
        TestData testData = createTestData(
                "invalid.reminder@example.com"
        );

        String requestBody = """
                {
                  "poiId": %d,
                  "visitOrder": 1,
                  "durationMinutes": 60,
                  "note": "Missing scheduled time",
                  "reminderMinutesBefore": 30
                }
                """.formatted(testData.poi().getId());

        mockMvc.perform(
                        post(
                                "/api/users/{userId}/trips/{tripId}"
                                        + "/days/{dayId}/plan-items",
                                testData.user().getId(),
                                testData.trip().getId(),
                                testData.tripDay().getId()
                        )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value(
                                "Scheduled time is required "
                                        + "when a reminder is set"
                        ));
    }

    private TestData createTestData(String email) {
        User user = new User(
                email,
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

        POI poi = createPoi(
                "planitem-golden-gate-" + email,
                "Golden Gate Bridge"
        );

        return new TestData(
                user,
                trip,
                tripDay,
                poi
        );
    }

    private POI createPoi(
            String externalPlaceId,
            String name
    ) {
        POI poi = new POI(
                externalPlaceId,
                name,
                "Golden Gate Bridge",
                "San Francisco",
                "US",
                "Attraction",
                37.8199,
                -122.4783,
                4.8
        );

        poi.setImageUrl(
                "https://example.com/golden-gate.jpg"
        );

        return poiRepository.save(poi);
    }

    private record TestData(
            User user,
            Trip trip,
            TripDay tripDay,
            POI poi
    ) {
    }
}