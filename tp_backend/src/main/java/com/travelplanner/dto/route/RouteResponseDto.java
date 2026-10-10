package com.travelplanner.dto.route;

import java.util.List;

public record RouteResponseDto(
        Long dayId,
        Long totalDistanceMeters,
        Long totalDurationSeconds,
        String overviewPolyline,
        List<RouteLegDto> legs
) {
    public static RouteResponseDto empty(Long dayId) {
        return new RouteResponseDto(dayId, 0L, 0L, "", List.of());
    }
}
