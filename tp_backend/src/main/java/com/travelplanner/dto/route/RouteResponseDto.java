package com.travelplanner.dto.route;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteResponseDto {
    private Long dayId;
    private Long totalDistanceMeters;
    private Long totalDurationSeconds;
    private String overviewPolyline;
    private List<RouteLegDto> legs;
}