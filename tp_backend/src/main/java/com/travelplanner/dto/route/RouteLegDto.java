package com.travelplanner.dto.route;

public record RouteLegDto(
        Long fromPlanItemId,
        Long fromPoiId,
        String fromPoiName,
        LocationDto fromLocation,
        Long toPlanItemId,
        Long toPoiId,
        String toPoiName,
        LocationDto toLocation,
        Long distanceMeters,
        String distanceText,
        Long durationSeconds,
        String durationText,
        String polyline
) {
}
