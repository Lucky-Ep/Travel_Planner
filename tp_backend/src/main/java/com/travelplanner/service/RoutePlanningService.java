package com.travelplanner.service;

import com.travelplanner.dto.route.LocationDto;
import com.travelplanner.dto.route.RouteLegDto;
import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.entity.POI;
import com.travelplanner.entity.PlanItem;
import com.travelplanner.exception.RouteUnavailableException;
import com.travelplanner.repository.PlanItemRepository;
import com.travelplanner.repository.TripDayRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoutePlanningService {
    private static final Duration CACHE_AGE = Duration.ofMinutes(20);
    private final PlanItemRepository planItems;
    private final TripDayRepository days;
    private final RestClient client;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, CachedRoute> cache = new ConcurrentHashMap<>();

    @Value("${google.maps.api-key:}")
    private String apiKey;

    public RoutePlanningService(PlanItemRepository planItems, TripDayRepository days) {
        this.planItems = planItems;
        this.days = days;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(12));
        this.client = RestClient.builder().requestFactory(factory).build();
    }

    public RouteResponseDto planRouteForDay(Long dayId) {
        if (!days.existsById(dayId)) {
            throw new com.travelplanner.exception.ResourceNotFoundException("Trip day not found with id: " + dayId);
        }
        List<PlanItem> valid = planItems.findByTripDayIdOrderByVisitOrderAsc(dayId).stream()
                .filter(item -> item.getPoi() != null
                        && item.getPoi().getLatitude() != null
                        && item.getPoi().getLongitude() != null)
                .toList();
        if (valid.size() < 2) {
            return RouteResponseDto.empty(dayId);
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new RouteUnavailableException("GOOGLE_MAPS_API_KEY is not configured");
        }

        StringBuilder signature = new StringBuilder(dayId.toString());
        for (PlanItem item : valid) {
            signature.append(':').append(item.getId()).append(',')
                    .append(item.getPoi().getId()).append(',')
                    .append(item.getPoi().getLatitude()).append(',')
                    .append(item.getPoi().getLongitude());
        }
        String cacheKey = signature.toString();
        CachedRoute cached = cache.get(cacheKey);
        if (cached != null && Instant.now().isBefore(cached.createdAt().plus(CACHE_AGE))) {
            return cached.response();
        }

        try {
            String json = client.get().uri(buildUri(valid)).retrieve().body(String.class);
            RouteResponseDto response = parse(dayId, valid, json);
            if (cache.size() >= 256) {
                cache.clear();
            }
            cache.put(cacheKey, new CachedRoute(Instant.now(), response));
            return response;
        } catch (RouteUnavailableException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new RouteUnavailableException("Route calculation is temporarily unavailable", exception);
        }
    }

    public List<RouteResponseDto> planRouteForTrip(Long tripId) {
        return days.findByTripIdOrderByDayIndexAsc(tripId).stream()
                .map(day -> planRouteForDay(day.getId()))
                .toList();
    }

    private URI buildUri(List<PlanItem> items) {
        StringBuilder url = new StringBuilder("https://maps.googleapis.com/maps/api/directions/json?origin=")
                .append(encode(coordinates(items.get(0).getPoi())))
                .append("&destination=")
                .append(encode(coordinates(items.get(items.size() - 1).getPoi())));
        if (items.size() > 2) {
            List<String> waypoints = new ArrayList<>();
            for (int i = 1; i < items.size() - 1; i++) {
                waypoints.add(coordinates(items.get(i).getPoi()));
            }
            url.append("&waypoints=").append(encode(String.join("|", waypoints)));
        }
        url.append("&mode=driving&key=").append(encode(apiKey));
        return URI.create(url.toString());
    }

    private String coordinates(POI poi) {
        return poi.getLatitude() + "," + poi.getLongitude();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private RouteResponseDto parse(Long dayId, List<PlanItem> items, String json) {
        JsonNode root = mapper.readTree(json);
        String status = root.get("status") == null ? "UNKNOWN" : root.get("status").asText();
        JsonNode routes = root.get("routes");
        if (!"OK".equals(status) || routes == null || routes.isEmpty()) {
            throw new RouteUnavailableException("Google Directions returned " + status);
        }
        JsonNode firstRoute = routes.get(0);
        JsonNode routeLegs = firstRoute.get("legs");
        if (routeLegs == null || routeLegs.size() != items.size() - 1) {
            throw new RouteUnavailableException("Route leg count does not match planned POIs");
        }
        String overview = firstRoute.get("overview_polyline").get("points").asText();
        List<RouteLegDto> legs = new ArrayList<>();
        long distance = 0;
        long duration = 0;
        for (int i = 0; i < routeLegs.size(); i++) {
            JsonNode leg = routeLegs.get(i);
            PlanItem from = items.get(i);
            PlanItem to = items.get(i + 1);
            long legDistance = leg.get("distance").get("value").asLong();
            long legDuration = leg.get("duration").get("value").asLong();
            legs.add(new RouteLegDto(
                    from.getId(), from.getPoi().getId(), from.getPoi().getName(),
                    new LocationDto(from.getPoi().getLatitude(), from.getPoi().getLongitude()),
                    to.getId(), to.getPoi().getId(), to.getPoi().getName(),
                    new LocationDto(to.getPoi().getLatitude(), to.getPoi().getLongitude()),
                    legDistance, leg.get("distance").get("text").asText(),
                    legDuration, leg.get("duration").get("text").asText(),
                    legPolyline(leg)
            ));
            distance += legDistance;
            duration += legDuration;
        }
        return new RouteResponseDto(dayId, distance, duration, overview, legs);
    }

    private String legPolyline(JsonNode leg) {
        JsonNode direct = leg.get("polyline");
        if (direct != null && direct.get("points") != null) {
            return direct.get("points").asText();
        }
        List<int[]> points = new ArrayList<>();
        JsonNode steps = leg.get("steps");
        if (steps != null) {
            for (JsonNode step : steps) {
                JsonNode polyline = step.get("polyline");
                if (polyline == null || polyline.get("points") == null) continue;
                String encoded = polyline.get("points").asText();
                if (encoded.isBlank()) continue;
                List<int[]> decoded = PolylineCodec.decode(encoded);
                if (!points.isEmpty() && !decoded.isEmpty()
                        && points.get(points.size() - 1)[0] == decoded.get(0)[0]
                        && points.get(points.size() - 1)[1] == decoded.get(0)[1]) {
                    decoded.remove(0);
                }
                points.addAll(decoded);
            }
        }
        return points.isEmpty() ? "" : PolylineCodec.encode(points);
    }

    private record CachedRoute(Instant createdAt, RouteResponseDto response) {
    }
}
