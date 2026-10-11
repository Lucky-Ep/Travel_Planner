package com.travelplanner.service;

import com.travelplanner.dto.route.LocationDto;
import com.travelplanner.dto.route.RouteLegDto;
import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.entity.POI;
import com.travelplanner.entity.PlanItem;
import com.travelplanner.exception.ResourceNotFoundException;
import com.travelplanner.exception.RouteUnavailableException;
import com.travelplanner.repository.PlanItemRepository;
import com.travelplanner.repository.TripDayRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoutePlanningService {
    private static final Duration CACHE_AGE = Duration.ofMinutes(20);
    private static final URI ROUTES_API_URI = URI.create("https://routes.googleapis.com/directions/v2:computeRoutes");
    private static final String FIELD_MASK = String.join(",",
            "routes.legs.distanceMeters",
            "routes.legs.duration",
            "routes.legs.polyline.encodedPolyline",
            "routes.legs.localizedValues",
            "routes.polyline.encodedPolyline");
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
            throw new ResourceNotFoundException("Trip day not found with id: " + dayId);
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
            String json = client.post()
                    .uri(ROUTES_API_URI)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .body(mapper.writeValueAsString(buildRequestBody(valid)))
                    .retrieve()
                    .body(String.class);
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

    private Map<String, Object> buildRequestBody(List<PlanItem> items) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("origin", waypoint(items.get(0).getPoi()));
        body.put("destination", waypoint(items.get(items.size() - 1).getPoi()));
        if (items.size() > 2) {
            List<Map<String, Object>> intermediates = new ArrayList<>();
            for (int i = 1; i < items.size() - 1; i++) {
                intermediates.add(waypoint(items.get(i).getPoi()));
            }
            body.put("intermediates", intermediates);
        }
        body.put("travelMode", "DRIVE");
        body.put("polylineEncoding", "ENCODED_POLYLINE");
        body.put("languageCode", "zh-CN");
        body.put("units", "METRIC");
        return body;
    }

    private Map<String, Object> waypoint(POI poi) {
        return Map.of("location", Map.of("latLng", Map.of(
                "latitude", poi.getLatitude(),
                "longitude", poi.getLongitude())));
    }

    private RouteResponseDto parse(Long dayId, List<PlanItem> items, String json) {
        JsonNode root = mapper.readTree(json);
        JsonNode routes = root.path("routes");
        if (!routes.isArray() || routes.isEmpty()) {
            throw new RouteUnavailableException("Google Routes returned no route for planned POIs");
        }
        JsonNode firstRoute = routes.get(0);
        JsonNode routeLegs = firstRoute.path("legs");
        if (!routeLegs.isArray() || routeLegs.size() != items.size() - 1) {
            throw new RouteUnavailableException("Route leg count does not match planned POIs");
        }
        String overview = firstRoute.path("polyline").path("encodedPolyline").asText("");
        if (overview.isBlank()) {
            throw new RouteUnavailableException("Google Routes returned no route polyline");
        }
        List<RouteLegDto> legs = new ArrayList<>();
        long distance = 0;
        long duration = 0;
        for (int i = 0; i < routeLegs.size(); i++) {
            JsonNode leg = routeLegs.get(i);
            PlanItem from = items.get(i);
            PlanItem to = items.get(i + 1);
            long legDistance = leg.path("distanceMeters").asLong(-1);
            long legDuration = durationSeconds(leg.path("duration").asText(""));
            if (legDistance < 0 || legDuration < 0) {
                throw new RouteUnavailableException("Google Routes returned incomplete route details");
            }
            JsonNode localized = leg.path("localizedValues");
            String distanceText = localized.path("distance").path("text")
                    .asText(String.format(Locale.ROOT, "%.1f km", legDistance / 1000.0));
            String durationText = localized.path("duration").path("text")
                    .asText(Math.round(legDuration / 60.0) + " min");
            legs.add(new RouteLegDto(
                    from.getId(), from.getPoi().getId(), from.getPoi().getName(),
                    new LocationDto(from.getPoi().getLatitude(), from.getPoi().getLongitude()),
                    to.getId(), to.getPoi().getId(), to.getPoi().getName(),
                    new LocationDto(to.getPoi().getLatitude(), to.getPoi().getLongitude()),
                    legDistance, distanceText,
                    legDuration, durationText,
                    leg.path("polyline").path("encodedPolyline").asText("")
            ));
            distance += legDistance;
            duration += legDuration;
        }
        return new RouteResponseDto(dayId, distance, duration, overview, legs);
    }

    private long durationSeconds(String value) {
        if (!value.endsWith("s")) {
            return -1;
        }
        try {
            return Math.round(Double.parseDouble(value.substring(0, value.length() - 1)));
        } catch (NumberFormatException exception) {
            return -1;
        }
    }

    private record CachedRoute(Instant createdAt, RouteResponseDto response) {
    }
}
