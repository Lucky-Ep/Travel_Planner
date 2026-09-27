package com.travelplanner.service;

import com.google.maps.internal.PolylineEncoding;
import com.google.maps.model.LatLng;
import com.travelplanner.dto.route.LocationDto;
import com.travelplanner.dto.route.RouteLegDto;
import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.entity.POI;
import com.travelplanner.entity.PlanItem;
import com.travelplanner.entity.TripDay;
import com.travelplanner.repository.PlanItemRepository;
import com.travelplanner.repository.TripDayRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
public class RoutePlanningServiceImpl implements RoutePlanningService {

    private final PlanItemRepository planItemRepository;
    private final TripDayRepository tripDayRepository;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${google.maps.api-key}")
    private String apiKey;

    public RoutePlanningServiceImpl(PlanItemRepository planItemRepository, TripDayRepository tripDayRepository) {
        this.planItemRepository = planItemRepository;
        this.tripDayRepository = tripDayRepository;
        this.restClient = RestClient.create();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public RouteResponseDto planRouteForDay(Long dayId) {

        List<PlanItem> plans =
                planItemRepository.findByTripDayIdOrderByVisitOrderAsc(dayId);

        // 优化点 4：过滤掉 null 或缺少经纬度的 POI，避免拼接 "null,null" 导致 Google API 报 INVALID_REQUEST
        List<POI> pois = new ArrayList<>();
        for (PlanItem plan : plans) {
            POI poi = plan.getPoi();
            if (poi != null && poi.getLatitude() != null && poi.getLongitude() != null) {
                pois.add(poi);
            } else {
                log.warn("跳过无效或缺少经纬度的 POI: planItemId={}, poiName={}",
                        plan.getId(), poi != null ? poi.getName() : "null");
            }
        }

        // 优化点 2：少于 2 个点时，返回结构完整且语义友好的空路线（包含 dayId，legs 为空列表，避免前端 TypeError）
        if (pois.size() <= 1) {
            return createEmptyRouteResponse(dayId);
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
        String googleUrl = urlBuilder.toString();

        // 优化点 5：复用单例 restClient，不再每次请求都重复创建
        String responseJsonString = restClient.get()
                .uri(googleUrl)
                .retrieve()
                .body(String.class);

        try {
            // 优化点 5：复用单例 objectMapper
            JsonNode root = objectMapper.readTree(responseJsonString);

            JsonNode routes = root.get("routes");
            String status = root.has("status") ? root.get("status").asText() : "UNKNOWN";

            // 优化点 3：Google 返回空或异常状态时，记录详细警告日志，便于排查（比如 API 额度超限、Key 失效、两地无路连接等）
            if (routes == null || routes.isEmpty()) {
                String errorMessage = root.has("error_message") ? root.get("error_message").asText() : "No routes returned";
                log.warn("Google Directions API 未返回有效路线. dayId={}, status={}, errorMessage={}",
                        dayId, status, errorMessage);
                return createEmptyRouteResponse(dayId);
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

                // 使用 Google 官方 SDK 提取该 leg 的独立完整折线
                String legPolyline = "";
                if (legJson.has("polyline") && legJson.get("polyline").has("points")) {
                    legPolyline = legJson.get("polyline").get("points").asText("");
                } else if (legJson.has("steps") && legJson.get("steps").isArray()) {
                    List<LatLng> legPoints = new ArrayList<>();
                    for (JsonNode stepNode : legJson.get("steps")) {
                        if (stepNode.has("polyline") && stepNode.get("polyline").has("points")) {
                            String stepPoints = stepNode.get("polyline").get("points").asText("");
                            if (!stepPoints.isEmpty()) {
                                legPoints.addAll(PolylineEncoding.decode(stepPoints));
                            }
                        }
                    }
                    if (!legPoints.isEmpty()) {
                        legPolyline = PolylineEncoding.encode(legPoints);
                    }
                }

                // 创建 RouteLegDto
                RouteLegDto leg = new RouteLegDto();

                leg.setFromPoiId(fromPoi.getId());
                leg.setFromPoiName(fromPoi.getName());
                if (fromPoi.getLatitude() != null && fromPoi.getLongitude() != null) {
                    leg.setFromLocation(new LocationDto(fromPoi.getLatitude(), fromPoi.getLongitude()));
                }

                leg.setToPoiId(toPoi.getId());
                leg.setToPoiName(toPoi.getName());
                if (toPoi.getLatitude() != null && toPoi.getLongitude() != null) {
                    leg.setToLocation(new LocationDto(toPoi.getLatitude(), toPoi.getLongitude()));
                }

                leg.setDistanceMeters(distanceMeters);
                leg.setDistanceText(distanceText);

                leg.setDurationSeconds(durationSeconds);
                leg.setDurationText(durationText);
                leg.setPolyline(legPolyline);

                legs.add(leg);

                // 累加整条路线距离和时间
                totalDistanceMeters += distanceMeters;
                totalDurationSeconds += durationSeconds;
            }

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

    /**
     * 构建无有效路线时语义完整的空结果，避免前端在解构 legs 时出现 null pointer
     */
    private RouteResponseDto createEmptyRouteResponse(Long dayId) {
        return RouteResponseDto.builder()
                .dayId(dayId)
                .totalDistanceMeters(0L)
                .totalDurationSeconds(0L)
                .overviewPolyline("")
                .legs(Collections.emptyList())
                .build();
    }

    @Override
    public List<RouteResponseDto> planRouteForTrip(Long tripId) {
        List<TripDay> days =
                tripDayRepository
                        .findByTripIdOrderByDayNumberAsc(tripId);
        List<RouteResponseDto> tripRoutes =
                new ArrayList<>();
        for (TripDay day : days) {

            RouteResponseDto dayRoute =
                    planRouteForDay(day.getId());

            tripRoutes.add(dayRoute);
        }
        return tripRoutes;
    }
}
