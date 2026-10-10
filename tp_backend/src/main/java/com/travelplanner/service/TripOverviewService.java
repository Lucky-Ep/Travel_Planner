package com.travelplanner.service;

import com.travelplanner.dto.overview.DayOverviewDto;
import com.travelplanner.dto.overview.TimelineEntryDto;
import com.travelplanner.dto.overview.TripOverviewDto;
import com.travelplanner.dto.planitem.PlanItemResponse;
import com.travelplanner.dto.route.RouteLegDto;
import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.dto.tripday.TripDayResponse;
import com.travelplanner.exception.RouteUnavailableException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TripOverviewService {
    private final TripService trips;
    private final TripDayService days;
    private final PlanItemService planItems;
    private final RoutePlanningService routes;

    public TripOverviewService(
            TripService trips,
            TripDayService days,
            PlanItemService planItems,
            RoutePlanningService routes
    ) {
        this.trips = trips;
        this.days = days;
        this.planItems = planItems;
        this.routes = routes;
    }

    public TripOverviewDto getOverview(Long userId, Long tripId) {
        var trip = trips.getTrip(userId, tripId);
        List<DayOverviewDto> dayOverviews = days.getTripDays(userId, tripId).stream()
                .map(day -> getDayOverview(userId, tripId, day))
                .toList();
        return new TripOverviewDto(trip, dayOverviews);
    }

    private DayOverviewDto getDayOverview(Long userId, Long tripId, TripDayResponse day) {
        List<PlanItemResponse> items = planItems.getPlanItems(userId, tripId, day.getId());
        RouteResponseDto route = RouteResponseDto.empty(day.getId());
        String status = "empty";
        String message = null;
        if (items.size() > 1) {
            try {
                route = routes.planRouteForDay(day.getId());
                status = route.legs().isEmpty() ? "empty" : "ready";
            } catch (RouteUnavailableException exception) {
                status = "unavailable";
                message = exception.getMessage();
            }
        }

        Map<String, RouteLegDto> legsByItems = new HashMap<>();
        for (RouteLegDto leg : route.legs()) {
            legsByItems.put(pairKey(leg.fromPlanItemId(), leg.toPlanItemId()), leg);
        }
        List<TimelineEntryDto> timeline = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            PlanItemResponse item = items.get(i);
            timeline.add(TimelineEntryDto.poi(item));
            if (i + 1 < items.size()) {
                PlanItemResponse next = items.get(i + 1);
                RouteLegDto leg = legsByItems.get(pairKey(item.getId(), next.getId()));
                timeline.add(TimelineEntryDto.travel(item.getId(), next.getId(), leg));
            }
        }
        return new DayOverviewDto(day, items, timeline, route, status, message);
    }

    private String pairKey(Long fromId, Long toId) {
        return fromId + ":" + toId;
    }
}
