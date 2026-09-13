package com.travelplanner.service;

import com.travelplanner.dto.route.RouteResponseDto;

import java.util.List;

public interface RoutePlanningService {

    /**
     * 根据指定的 TripDay ID，规划当天的整条路线
     *
     * @param dayId 某天的行程ID (TripDay.id)
     * @return 包含全天折线和分段耗时距离的路线数据
     */
    RouteResponseDto planRouteForDay(Long dayId);
    List<RouteResponseDto> planRouteForTrip(Long tripId);

}