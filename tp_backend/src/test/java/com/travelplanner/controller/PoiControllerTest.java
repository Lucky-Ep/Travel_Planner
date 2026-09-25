package com.travelplanner.controller;

import com.travelplanner.entity.POI;
import com.travelplanner.repository.POIRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

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
class PoiControllerTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private POIRepository poiRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(webApplicationContext)
                .build();
    }

    @Test
    void createPoiReturnsSavedPoi() throws Exception {
        String requestBody = """
                {
                  "externalPlaceId": "google-golden-gate",
                  "name": "Golden Gate Bridge",
                  "address": "Golden Gate Bridge",
                  "city": "San Francisco",
                  "countryCode": "us",
                  "category": "Attraction",
                  "latitude": 37.8199,
                  "longitude": -122.4783,
                  "rating": 4.8,
                  "imageUrl": "https://example.com/golden-gate.jpg"
                }
                """;

        mockMvc.perform(
                        post("/api/pois")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.externalPlaceId")
                        .value("google-golden-gate"))
                .andExpect(jsonPath("$.name")
                        .value("Golden Gate Bridge"))
                .andExpect(jsonPath("$.countryCode").value("US"))
                .andExpect(jsonPath("$.imageUrl")
                        .value(
                                "https://example.com/golden-gate.jpg"
                        ));
    }

    @Test
    void createPoiReusesExistingExternalPlaceId()
            throws Exception {
        String requestBody = """
                {
                  "externalPlaceId": "google-reused-place",
                  "name": "Golden Gate Bridge",
                  "address": "Golden Gate Bridge",
                  "city": "San Francisco",
                  "countryCode": "US",
                  "category": "Attraction",
                  "latitude": 37.8199,
                  "longitude": -122.4783,
                  "rating": 4.8,
                  "imageUrl": null
                }
                """;

        mockMvc.perform(
                        post("/api/pois")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isOk());

        mockMvc.perform(
                        post("/api/pois")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isOk());

        List<POI> result =
                poiRepository.findByCityIgnoreCase(
                        "San Francisco"
                );

        long matchingCount = result.stream()
                .filter(poi ->
                        poi.getExternalPlaceId()
                                .equals("google-reused-place")
                )
                .count();

        assertEquals(1, matchingCount);
    }

    @Test
    void searchPoisFiltersByCityAndCategory()
            throws Exception {
        poiRepository.saveAll(List.of(
                createPoi(
                        "poi-attraction-sf",
                        "Golden Gate Bridge",
                        "San Francisco",
                        "Attraction"
                ),
                createPoi(
                        "poi-market-sf",
                        "Ferry Building",
                        "San Francisco",
                        "Market"
                ),
                createPoi(
                        "poi-attraction-seattle",
                        "Space Needle",
                        "Seattle",
                        "Attraction"
                )
        ));

        mockMvc.perform(
                        get("/api/pois")
                                .param(
                                        "city",
                                        "SAN FRANCISCO"
                                )
                                .param(
                                        "category",
                                        "ATTRACTION"
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name")
                        .value("Golden Gate Bridge"));
    }

    @Test
    void updatePoiReturnsUpdatedPoi() throws Exception {
        POI poi = poiRepository.save(
                createPoi(
                        "poi-update-test",
                        "Old Name",
                        "San Francisco",
                        "Attraction"
                )
        );

        String requestBody = """
                {
                  "name": "Updated Place",
                  "address": "Updated Address",
                  "city": "Oakland",
                  "countryCode": "us",
                  "category": "Museum",
                  "latitude": 37.8044,
                  "longitude": -122.2712,
                  "rating": 4.5,
                  "imageUrl": "https://example.com/updated.jpg"
                }
                """;

        mockMvc.perform(
                        put(
                                "/api/pois/{poiId}",
                                poi.getId()
                        )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name")
                        .value("Updated Place"))
                .andExpect(jsonPath("$.city")
                        .value("Oakland"))
                .andExpect(jsonPath("$.countryCode")
                        .value("US"))
                .andExpect(jsonPath("$.category")
                        .value("Museum"));
    }

    @Test
    void deleteUnusedPoiRemovesPoi() throws Exception {
        POI poi = poiRepository.save(
                createPoi(
                        "poi-delete-test",
                        "Place To Delete",
                        "Oakland",
                        "Museum"
                )
        );

        Long poiId = poi.getId();

        mockMvc.perform(
                        delete(
                                "/api/pois/{poiId}",
                                poiId
                        )
                )
                .andExpect(status().isNoContent());

        assertFalse(poiRepository.existsById(poiId));
    }

    @Test
    void createPoiRejectsInvalidCoordinates()
            throws Exception {
        String requestBody = """
                {
                  "externalPlaceId": "invalid-coordinate-place",
                  "name": "Invalid Place",
                  "address": "Invalid Address",
                  "city": "Oakland",
                  "countryCode": "US",
                  "category": "Other",
                  "latitude": 100.0,
                  "longitude": -200.0,
                  "rating": 4.0,
                  "imageUrl": null
                }
                """;

        mockMvc.perform(
                        post("/api/pois")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.latitude")
                        .value(
                                "Latitude must not exceed 90"
                        ))
                .andExpect(jsonPath("$.fieldErrors.longitude")
                        .value(
                                "Longitude must be at least -180"
                        ));
    }

    private POI createPoi(
            String externalPlaceId,
            String name,
            String city,
            String category
    ) {
        return new POI(
                externalPlaceId,
                name,
                "Test Address",
                city,
                "US",
                category,
                37.8199,
                -122.4783,
                4.5
        );
    }
}