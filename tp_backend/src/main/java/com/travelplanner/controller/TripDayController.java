package com.travelplanner.controller;

import com.travelplanner.dto.tripday.CreateTripDayRequest;
import com.travelplanner.dto.tripday.TripDayResponse;
import com.travelplanner.dto.tripday.UpdateTripDayRequest;
import com.travelplanner.service.TripDayService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(
        "/api/users/{userId}/trips/{tripId}/days"
)
public class TripDayController {

    private final TripDayService tripDayService;

    public TripDayController(
            TripDayService tripDayService
    ) {
        this.tripDayService = tripDayService;
    }

    @PostMapping
    public ResponseEntity<TripDayResponse> createTripDay(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @Valid @RequestBody CreateTripDayRequest request
    ) {
        TripDayResponse response =
                tripDayService.createTripDay(
                        userId,
                        tripId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<TripDayResponse>> getTripDays(
            @PathVariable Long userId,
            @PathVariable Long tripId
    ) {
        List<TripDayResponse> response =
                tripDayService.getTripDays(
                        userId,
                        tripId
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{dayId}")
    public ResponseEntity<TripDayResponse> getTripDay(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @PathVariable Long dayId
    ) {
        TripDayResponse response =
                tripDayService.getTripDay(
                        userId,
                        tripId,
                        dayId
                );

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{dayId}")
    public ResponseEntity<TripDayResponse> updateTripDay(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @Valid @RequestBody UpdateTripDayRequest request
    ) {
        TripDayResponse response =
                tripDayService.updateTripDay(
                        userId,
                        tripId,
                        dayId,
                        request
                );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{dayId}")
    public ResponseEntity<Void> deleteTripDay(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @PathVariable Long dayId
    ) {
        tripDayService.deleteTripDay(
                userId,
                tripId,
                dayId
        );

        return ResponseEntity.noContent().build();
    }
}