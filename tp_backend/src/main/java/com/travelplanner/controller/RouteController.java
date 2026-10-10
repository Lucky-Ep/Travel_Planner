package com.travelplanner.controller;

import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.service.RoutePlanningService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
public class RouteController {
    private final RoutePlanningService routes;

    public RouteController(RoutePlanningService routes) {
        this.routes = routes;
    }

    @GetMapping("/days/{dayId}")
    public RouteResponseDto getDayRoute(@PathVariable Long dayId) {
        return routes.planRouteForDay(dayId);
    }

    @GetMapping("/trips/{tripId}")
    public List<RouteResponseDto> getTripRoutes(@PathVariable Long tripId) {
        return routes.planRouteForTrip(tripId);
    }
}
