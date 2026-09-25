package com.travelplanner.controller;

import com.travelplanner.dto.planitem.CreatePlanItemRequest;
import com.travelplanner.dto.planitem.PlanItemResponse;
import com.travelplanner.dto.planitem.UpdatePlanItemRequest;
import com.travelplanner.service.PlanItemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(
        "/api/users/{userId}/trips/{tripId}"
                + "/days/{dayId}/plan-items"
)
public class PlanItemController {

    private final PlanItemService planItemService;

    public PlanItemController(
            PlanItemService planItemService
    ) {
        this.planItemService = planItemService;
    }

    @PostMapping
    public ResponseEntity<PlanItemResponse> createPlanItem(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @Valid @RequestBody CreatePlanItemRequest request
    ) {
        PlanItemResponse response =
                planItemService.createPlanItem(
                        userId,
                        tripId,
                        dayId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<PlanItemResponse>> getPlanItems(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @PathVariable Long dayId
    ) {
        List<PlanItemResponse> response =
                planItemService.getPlanItems(
                        userId,
                        tripId,
                        dayId
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{planItemId}")
    public ResponseEntity<PlanItemResponse> getPlanItem(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @PathVariable Long planItemId
    ) {
        PlanItemResponse response =
                planItemService.getPlanItem(
                        userId,
                        tripId,
                        dayId,
                        planItemId
                );

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{planItemId}")
    public ResponseEntity<PlanItemResponse> updatePlanItem(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @PathVariable Long planItemId,
            @Valid @RequestBody UpdatePlanItemRequest request
    ) {
        PlanItemResponse response =
                planItemService.updatePlanItem(
                        userId,
                        tripId,
                        dayId,
                        planItemId,
                        request
                );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{planItemId}")
    public ResponseEntity<Void> deletePlanItem(
            @PathVariable Long userId,
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @PathVariable Long planItemId
    ) {
        planItemService.deletePlanItem(
                userId,
                tripId,
                dayId,
                planItemId
        );

        return ResponseEntity.noContent().build();
    }
}