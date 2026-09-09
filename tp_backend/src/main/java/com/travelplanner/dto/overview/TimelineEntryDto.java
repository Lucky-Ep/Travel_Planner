package com.travelplanner.dto.overview;

import com.travelplanner.dto.planitem.PlanItemResponse;
import com.travelplanner.dto.route.RouteLegDto;

public record TimelineEntryDto(
        String type,
        PlanItemResponse planItem,
        Long fromPlanItemId,
        Long toPlanItemId,
        Long distanceMeters,
        String distanceText,
        Long durationSeconds,
        String durationText,
        String polyline
) {
    public static TimelineEntryDto poi(PlanItemResponse item) {
        return new TimelineEntryDto("poi", item, null, null, null, null, null, null, null);
    }

    public static TimelineEntryDto travel(Long fromId, Long toId, RouteLegDto leg) {
        return new TimelineEntryDto(
                "travel", null, fromId, toId,
                leg == null ? null : leg.distanceMeters(),
                leg == null ? null : leg.distanceText(),
                leg == null ? null : leg.durationSeconds(),
                leg == null ? null : leg.durationText(),
                leg == null ? null : leg.polyline()
        );
    }
}
