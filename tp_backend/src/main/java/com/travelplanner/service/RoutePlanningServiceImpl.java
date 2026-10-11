package com.travelplanner.service;

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
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 路线规划服务：调用 Google Routes API (computeRoutes)。
 * 注：旧版 Directions API 已被 Google 归为 Legacy，新建项目无法启用，因此迁移至 Routes API。
 * 对外返回的 RouteResponseDto 结构保持不变，前端 MapLibre 无需改动。
 */
@Slf4j
@Service
public class RoutePlanningServiceImpl implements RoutePlanningService {

    private static final String ROUTES_API_URL =
            "https://routes.googleapis.com/directions/v2:computeRoutes";


    private static final String FIELD_MASK = String.join(",",
            "routes.distanceMeters",
            "routes.duration",
            "routes.polyline.encodedPolyline",
            "routes.legs.distanceMeters",
            "routes.legs.duration",
            "routes.legs.polyline.encodedPolyline",
            "routes.legs.localizedValues"
    );

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

        // 少于 2 个点时，返回结构完整且语义友好的空路线（包含 dayId，legs 为空列表，避免前端 TypeError）
        if (pois.size() <= 1) {
            return createEmptyRouteResponse(dayId);
        }

        // 1. 构建 Routes API 请求体
        Map<String, Object> requestBody = buildRequestBody(pois);

        // 2. 调用 Routes API（POST + 请求头传 Key 和 FieldMask）
        String responseJsonString;
        try {
            responseJsonString = restClient.post()
                    .uri(ROUTES_API_URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .body(objectMapper.writeValueAsString(requestBody))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException e) {
            // Routes API 出错时返回 HTTP 4xx/5xx，错误详情在响应体的 error.message 中
            log.warn("Google Routes API 请求失败. dayId={}, httpStatus={}, errorBody={}",
                    dayId, e.getStatusCode(), e.getResponseBodyAsString());
            return createEmptyRouteResponse(dayId);
        }

        // 3. 解析响应
        try {
            JsonNode root = objectMapper.readTree(responseJsonString);
            JsonNode routes = root.get("routes");

            // 两点之间无可行路线时，Routes API 返回空对象 {}
            if (routes == null || routes.isEmpty()) {
                log.warn("Google Routes API 未返回有效路线. dayId={}, response={}", dayId, responseJsonString);
                return createEmptyRouteResponse(dayId);
            }

            // 取 Google 返回的第一条路线
            JsonNode firstRoute = routes.get(0);

            // 整条路线的 polyline
            String overviewPolyline = firstRoute.path("polyline").path("encodedPolyline").asText("");

            // Google 返回的所有 leg
            JsonNode legsJson = firstRoute.path("legs");

            List<RouteLegDto> legs = new ArrayList<>();

            long totalDistanceMeters = 0;
            long totalDurationSeconds = 0;

            for (int i = 0; i < legsJson.size(); i++) {

                JsonNode legJson = legsJson.get(i);

                // 对应这一段路线两端的 POI
                POI fromPoi = pois.get(i);
                POI toPoi = pois.get(i + 1);

                // 距离（米）
                long distanceMeters = legJson.path("distanceMeters").asLong(0);

                // 时间：Routes API 返回的是 "572s" 这种字符串，需要转换为秒数
                long durationSeconds = parseDurationSeconds(legJson.path("duration").asText(""));

                // 显示文本（如 "1.8 km" / "10 mins"）
                JsonNode localized = legJson.path("localizedValues");
                String distanceText = localized.path("distance").path("text")
                        .asText(String.format("%.1f km", distanceMeters / 1000.0));
                String durationText = localized.path("duration").path("text")
                        .asText(Math.round(durationSeconds / 60.0) + " mins");

                // 这一段 leg 的折线（Routes API 直接提供，无需再拼接 steps）
                String legPolyline = legJson.path("polyline").path("encodedPolyline").asText("");

                // 创建 RouteLegDto
                RouteLegDto leg = new RouteLegDto();

                leg.setFromPoiId(fromPoi.getId());
                leg.setFromPoiName(fromPoi.getName());
                leg.setFromLocation(new LocationDto(fromPoi.getLatitude(), fromPoi.getLongitude()));

                leg.setToPoiId(toPoi.getId());
                leg.setToPoiName(toPoi.getName());
                leg.setToLocation(new LocationDto(toPoi.getLatitude(), toPoi.getLongitude()));

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
            throw new RuntimeException("Failed to parse Google Routes API response", e);
        }
    }

    /**
     * 构建 Routes API 请求体：
     * {
     *   "origin": {...}, "destination": {...}, "intermediates": [...],
     *   "travelMode": "DRIVE", "polylineEncoding": "ENCODED_POLYLINE", ...
     * }
     */
    private Map<String, Object> buildRequestBody(List<POI> pois) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("origin", toWaypoint(pois.get(0)));
        body.put("destination", toWaypoint(pois.get(pois.size() - 1)));

        List<Map<String, Object>> intermediates = new ArrayList<>();
        for (int i = 1; i < pois.size() - 1; i++) {
            intermediates.add(toWaypoint(pois.get(i)));
        }
        if (!intermediates.isEmpty()) {
            body.put("intermediates", intermediates);
        }

        body.put("travelMode", "DRIVE");
        body.put("polylineEncoding", "ENCODED_POLYLINE");
        body.put("languageCode", "en-US");
        body.put("units", "METRIC");
        return body;
    }

    /**
     * POI -> Routes API 的 Waypoint 格式：{"location": {"latLng": {"latitude": .., "longitude": ..}}}
     */
    private Map<String, Object> toWaypoint(POI poi) {
        Map<String, Object> latLng = new LinkedHashMap<>();
        latLng.put("latitude", poi.getLatitude());
        latLng.put("longitude", poi.getLongitude());
        return Map.of("location", Map.of("latLng", latLng));
    }

    /**
     * 将 Routes API 的 duration 字符串（如 "572s"）解析为秒数
     */
    private long parseDurationSeconds(String duration) {
        if (duration == null || duration.isBlank()) {
            return 0L;
        }
        String numeric = duration.endsWith("s") ? duration.substring(0, duration.length() - 1) : duration;
        try {
            return Math.round(Double.parseDouble(numeric));
        } catch (NumberFormatException e) {
            log.warn("无法解析 Routes API duration: {}", duration);
            return 0L;
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
