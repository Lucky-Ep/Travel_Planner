package com.travelplanner.service;

import com.travelplanner.dto.route.RouteLegDto;
import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.entity.POI;
import com.travelplanner.entity.PlanItem;
import com.travelplanner.entity.TripDay;
import com.travelplanner.repository.PlanItemRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.travelplanner.repository.TripDayRepository;
import java.util.ArrayList;
import java.util.List;

@Service
public class RoutePlanningServiceImpl implements RoutePlanningService {

    private final PlanItemRepository planItemRepository;
    @Value("${google.maps.api-key}")
    private String apiKey;
    private final TripDayRepository tripDayRepository;

    public RoutePlanningServiceImpl(PlanItemRepository planItemRepository,TripDayRepository tripDayRepository) {
        this.planItemRepository = planItemRepository;
        this.tripDayRepository=tripDayRepository;
    }

    @Override
    public RouteResponseDto planRouteForDay(Long dayId) {

        List<PlanItem> plans =
                planItemRepository.findByTripDayIdOrderByVisitOrderAsc(dayId);

        List<POI> pois = new ArrayList<>();

        for (PlanItem plan : plans) {
            pois.add(plan.getPoi());
        }
        if (pois.size() <=1)
        {
            return new RouteResponseDto();
        }
        POI originPoi = pois.get(0);
        String origin = originPoi.getLatitude() + "," + originPoi.getLongitude();
        POI destinationPoi = pois.get(pois.size() - 1);
        String destination = destinationPoi.getLatitude() + "," + destinationPoi.getLongitude();
        List<String> waypointCoords = new ArrayList<>();
        for (int i = 1; i < pois.size() - 1; i++) {
            POI midPoi = pois.get(i);
            waypointCoords.add(midPoi.getLatitude() + "," + midPoi.getLongitude());
        }
        String waypoints = String.join("|", waypointCoords);
        StringBuilder urlBuilder = new StringBuilder("https://maps.googleapis.com/maps/api/directions/json?");
        urlBuilder.append("origin=").append(origin);
        urlBuilder.append("&destination=").append(destination);
        if (!waypoints.isEmpty()) {
            urlBuilder.append("&waypoints=").append(waypoints);
        }
        urlBuilder.append("&mode=driving");
        urlBuilder.append("&key=").append(apiKey);
        String googleUrl=urlBuilder.toString();
        RestClient restClient = RestClient.create();

        String responseJsonString = restClient.get()
                .uri(googleUrl)
                .retrieve()
                .body(String.class);
        ObjectMapper objectMapper = new ObjectMapper();

        try {
            JsonNode root = objectMapper.readTree(responseJsonString);

            JsonNode routes = root.get("routes");

            if (routes == null || routes.isEmpty()) {
                return new RouteResponseDto();
            }

            // 取 Google 返回的第一条路线
            JsonNode firstRoute = routes.get(0);

            // 整条路线的 polyline
            String overviewPolyline = firstRoute
                    .get("overview_polyline")
                    .get("points")
                    .asText();

            // Google 返回的所有 leg
            JsonNode legsJson = firstRoute.get("legs");

            List<RouteLegDto> legs = new ArrayList<>();

            long totalDistanceMeters = 0;
            long totalDurationSeconds = 0;

            for (int i = 0; i < legsJson.size(); i++) {

                JsonNode legJson = legsJson.get(i);

                // 对应这一段路线两端的 POI
                POI fromPoi = pois.get(i);
                POI toPoi = pois.get(i + 1);

                // Google JSON 中的 distance
                long distanceMeters = legJson
                        .get("distance")
                        .get("value")
                        .asLong();

                String distanceText = legJson
                        .get("distance")
                        .get("text")
                        .asText();

                // Google JSON 中的 duration
                long durationSeconds = legJson
                        .get("duration")
                        .get("value")
                        .asLong();

                String durationText = legJson
                        .get("duration")
                        .get("text")
                        .asText();

                // 创建 RouteLegDto
                RouteLegDto leg = new RouteLegDto();

                leg.setFromPoiId(fromPoi.getId());
                leg.setFromPoiName(fromPoi.getName());

                leg.setToPoiId(toPoi.getId());
                leg.setToPoiName(toPoi.getName());

                leg.setDistanceMeters(distanceMeters);
                leg.setDistanceText(distanceText);

                leg.setDurationSeconds(durationSeconds);
                leg.setDurationText(durationText);

                legs.add(leg);

                // 累加整条路线距离和时间
                totalDistanceMeters += distanceMeters;
                totalDurationSeconds += durationSeconds;
            }

            // 最后合成 RouteResponseDto
            RouteResponseDto response = new RouteResponseDto();

            response.setDayId(dayId);
            response.setTotalDistanceMeters(totalDistanceMeters);
            response.setTotalDurationSeconds(totalDurationSeconds);
            response.setOverviewPolyline(overviewPolyline);
            response.setLegs(legs);

            return response;

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Google Directions response", e);
        }



    }
    @Override
    public List<RouteResponseDto> planRouteForTrip(Long tripId) {

        // 1. 获取这趟 Trip 的所有 Day，
        // 按 dayNumber 从小到大排列
        List<TripDay> days =
                tripDayRepository
                        .findByTripIdOrderByDayNumberAsc(tripId);

        // 2. 保存每一天的 RouteResponseDto
        List<RouteResponseDto> tripRoutes =
                new ArrayList<>();

        // 3. 每一天调用已经写好的 planRouteForDay
        for (TripDay day : days) {

            RouteResponseDto dayRoute =
                    planRouteForDay(day.getId());

            tripRoutes.add(dayRoute);
        }

        // 4. 返回整个 Trip 每一天的路线
        return tripRoutes;
    }
}
