package com.travelplanner.service;

import com.travelplanner.dto.planitem.PlanItemResponse;
import com.travelplanner.dto.route.LocationDto;
import com.travelplanner.dto.route.RouteLegDto;
import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.dto.trip.TripResponse;
import com.travelplanner.dto.tripday.TripDayResponse;
import com.travelplanner.exception.RouteUnavailableException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TripOverviewServiceTest {
    @Test
    void interleavesVisitsAndTheirCalculatedLeg() {
        TripService trips = mock(TripService.class);
        TripDayService days = mock(TripDayService.class);
        PlanItemService items = mock(PlanItemService.class);
        RoutePlanningService routes = mock(RoutePlanningService.class);
        TripDayResponse day = new TripDayResponse(7L, 3L, 0, LocalDate.of(2026, 10, 1));
        PlanItemResponse first = mock(PlanItemResponse.class);
        PlanItemResponse second = mock(PlanItemResponse.class);
        when(first.getId()).thenReturn(11L);
        when(second.getId()).thenReturn(12L);
        when(trips.getTrip(1L, 3L)).thenReturn(mock(TripResponse.class));
        when(days.getTripDays(1L, 3L)).thenReturn(List.of(day));
        when(items.getPlanItems(1L, 3L, 7L)).thenReturn(List.of(first, second));
        RouteLegDto leg = new RouteLegDto(11L, 101L, "A", new LocationDto(31.2, 121.4),
                12L, 102L, "B", new LocationDto(31.3, 121.5),
                1200L, "1.2 km", 600L, "10 mins", "abc");
        when(routes.planRouteForDay(7L)).thenReturn(new RouteResponseDto(7L, 1200L, 600L, "abc", List.of(leg)));

        var result = new TripOverviewService(trips, days, items, routes).getOverview(1L, 3L).days().get(0);
        assertEquals("ready", result.routeStatus());
        assertEquals(List.of("poi", "travel", "poi"), result.timeline().stream().map(entry -> entry.type()).toList());
        assertEquals(11L, result.timeline().get(1).fromPlanItemId());
        assertEquals(12L, result.timeline().get(1).toPlanItemId());
        assertEquals(600L, result.timeline().get(1).durationSeconds());
    }

    @Test
    void keepsVisitsVisibleWhenRoutingFails() {
        TripService trips = mock(TripService.class);
        TripDayService days = mock(TripDayService.class);
        PlanItemService items = mock(PlanItemService.class);
        RoutePlanningService routes = mock(RoutePlanningService.class);
        TripDayResponse day = new TripDayResponse(7L, 3L, 0, LocalDate.of(2026, 10, 1));
        PlanItemResponse first = mock(PlanItemResponse.class);
        PlanItemResponse second = mock(PlanItemResponse.class);
        when(first.getId()).thenReturn(11L);
        when(second.getId()).thenReturn(12L);
        when(trips.getTrip(1L, 3L)).thenReturn(mock(TripResponse.class));
        when(days.getTripDays(1L, 3L)).thenReturn(List.of(day));
        when(items.getPlanItems(1L, 3L, 7L)).thenReturn(List.of(first, second));
        when(routes.planRouteForDay(7L)).thenThrow(new RouteUnavailableException("no key"));

        var result = new TripOverviewService(trips, days, items, routes).getOverview(1L, 3L).days().get(0);
        assertEquals("unavailable", result.routeStatus());
        assertEquals(3, result.timeline().size());
        assertNull(result.timeline().get(1).durationSeconds());
    }
}
