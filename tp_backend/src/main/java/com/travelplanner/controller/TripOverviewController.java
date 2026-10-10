package com.travelplanner.controller;

import com.travelplanner.dto.overview.TripOverviewDto;
import com.travelplanner.service.TripOverviewService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/{userId}/trips/{tripId}/overview")
public class TripOverviewController {
    private final TripOverviewService overviews;

    public TripOverviewController(TripOverviewService overviews) {
        this.overviews = overviews;
    }

    @GetMapping
    public TripOverviewDto getOverview(@PathVariable Long userId, @PathVariable Long tripId) {
        return overviews.getOverview(userId, tripId);
    }
}
