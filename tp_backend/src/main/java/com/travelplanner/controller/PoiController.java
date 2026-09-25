package com.travelplanner.controller;

import com.travelplanner.dto.poi.CreatePoiRequest;
import com.travelplanner.dto.poi.PoiResponse;
import com.travelplanner.dto.poi.UpdatePoiRequest;
import com.travelplanner.service.PoiService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pois")
public class PoiController {

    private final PoiService poiService;

    public PoiController(PoiService poiService) {
        this.poiService = poiService;
    }

    @PostMapping
    public ResponseEntity<PoiResponse> createOrGetPoi(
            @Valid @RequestBody CreatePoiRequest request
    ) {
        PoiResponse response =
                poiService.createOrGetPoi(request);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{poiId}")
    public ResponseEntity<PoiResponse> getPoi(
            @PathVariable Long poiId
    ) {
        PoiResponse response =
                poiService.getPoi(poiId);

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<PoiResponse>> searchPois(
            @RequestParam String city,
            @RequestParam(required = false) String category
    ) {
        List<PoiResponse> response =
                poiService.searchPois(city, category);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{poiId}")
    public ResponseEntity<PoiResponse> updatePoi(
            @PathVariable Long poiId,
            @Valid @RequestBody UpdatePoiRequest request
    ) {
        PoiResponse response =
                poiService.updatePoi(poiId, request);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{poiId}")
    public ResponseEntity<Void> deletePoi(
            @PathVariable Long poiId
    ) {
        poiService.deletePoi(poiId);

        return ResponseEntity.noContent().build();
    }
}