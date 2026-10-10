package com.travelplanner.dto.overview;

import com.travelplanner.dto.trip.TripResponse;

import java.util.List;

public record TripOverviewDto(TripResponse trip, List<DayOverviewDto> days) {
}
