package com.travelplanner.controller;

import com.travelplanner.dto.trip.CreateTripRequest;
import com.travelplanner.dto.trip.TripResponse;
import com.travelplanner.dto.trip.UpdateTripRequest;
import com.travelplanner.service.TripService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/trips")
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(
            @PathVariable Long userId,
            @Valid @RequestBody CreateTripRequest request
    ) {
        TripResponse response =
                tripService.createTrip(userId, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<TripResponse>> getTrips(
            @PathVariable Long userId
    ) {
        List<TripResponse> response =
                tripService.getTripsByUser(userId);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{tripId}")
    public ResponseEntity<TripResponse> getTrip(
            @PathVariable Long userId,
            @PathVariable Long tripId
    ) {
        TripResponse response =
                tripService.getTrip(userId, tripId);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{tripId}")
    public ResponseEntity<TripResponse> updateTrip(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @Valid @RequestBody UpdateTripRequest request
    ) {
        TripResponse response =
                tripService.updateTrip(userId, tripId, request);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{tripId}")
    public ResponseEntity<Void> deleteTrip(
            @PathVariable Long userId,
            @PathVariable Long tripId
    ) {
        tripService.deleteTrip(userId, tripId);

        return ResponseEntity.noContent().build();
    }
}