package com.travelplanner.dto.overview;

import com.travelplanner.dto.planitem.PlanItemResponse;
import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.dto.tripday.TripDayResponse;

import java.util.List;

public record DayOverviewDto(
        TripDayResponse day,
        List<PlanItemResponse> planItems,
        List<TimelineEntryDto> timeline,
        RouteResponseDto route,
        String routeStatus,
        String routeMessage
) {
}
