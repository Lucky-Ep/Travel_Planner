package com.travelplanner.controller;

import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.service.RoutePlanningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RoutePlanningService routePlanningService;

    /**
     * 获取指定单日（Day）的路线规划结果
     * 请求示例：GET http://localhost:8080/api/routes/days/1
     */
    @GetMapping("/days/{dayId}")
    public ResponseEntity<RouteResponseDto> getRouteForDay(@PathVariable Long dayId) {
        RouteResponseDto route = routePlanningService.planRouteForDay(dayId);
        return ResponseEntity.ok(route);
    }

    /**
     * 获取指定整趟行程（Trip）所有天数的路线规划结果列表
     * 请求示例：GET http://localhost:8080/api/routes/trips/10
     */
    @GetMapping("/trips/{tripId}")
    public ResponseEntity<List<RouteResponseDto>> getRoutesForTrip(@PathVariable Long tripId) {
        List<RouteResponseDto> routes = routePlanningService.planRouteForTrip(tripId);
        return ResponseEntity.ok(routes);
    }
}