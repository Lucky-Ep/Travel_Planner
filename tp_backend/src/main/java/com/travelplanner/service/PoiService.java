package com.travelplanner.service;

import com.travelplanner.dto.poi.CreatePoiRequest;
import com.travelplanner.dto.poi.PoiResponse;
import com.travelplanner.dto.poi.UpdatePoiRequest;
import com.travelplanner.entity.POI;
import com.travelplanner.exception.BadRequestException;
import com.travelplanner.exception.ResourceNotFoundException;
import com.travelplanner.repository.POIRepository;
import com.travelplanner.repository.PlanItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class PoiService {

    private final POIRepository poiRepository;
    private final PlanItemRepository planItemRepository;

    public PoiService(
            POIRepository poiRepository,
            PlanItemRepository planItemRepository
    ) {
        this.poiRepository = poiRepository;
        this.planItemRepository = planItemRepository;
    }

    @Transactional
    public PoiResponse createOrGetPoi(
            CreatePoiRequest request
    ) {
        return poiRepository
                .findByExternalPlaceId(
                        request.getExternalPlaceId().trim()
                )
                .map(this::toResponse)
                .orElseGet(() -> createPoi(request));
    }

    @Transactional(readOnly = true)
    public PoiResponse getPoi(Long poiId) {
        return toResponse(findPoi(poiId));
    }

    @Transactional(readOnly = true)
    public List<PoiResponse> searchPois(
            String city,
            String category
    ) {
        if (city == null || city.isBlank()) {
            throw new BadRequestException(
                    "City query parameter is required"
            );
        }

        List<POI> pois;

        if (category == null || category.isBlank()) {
            pois = poiRepository.findByCityIgnoreCase(
                    city.trim()
            );
        } else {
            pois =
                    poiRepository
                            .findByCityIgnoreCaseAndCategoryIgnoreCase(
                                    city.trim(),
                                    category.trim()
                            );
        }

        return pois.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PoiResponse updatePoi(
            Long poiId,
            UpdatePoiRequest request
    ) {
        POI poi = findPoi(poiId);

        poi.setName(request.getName().trim());
        poi.setAddress(normalizeOptionalText(
                request.getAddress()
        ));
        poi.setCity(request.getCity().trim());
        poi.setCountryCode(
                normalizeCountryCode(
                        request.getCountryCode()
                )
        );
        poi.setCategory(normalizeOptionalText(
                request.getCategory()
        ));
        poi.setLatitude(request.getLatitude());
        poi.setLongitude(request.getLongitude());
        poi.setRating(request.getRating());
        poi.setImageUrl(normalizeOptionalText(
                request.getImageUrl()
        ));

        POI updatedPoi = poiRepository.save(poi);

        return toResponse(updatedPoi);
    }

    @Transactional
    public void deletePoi(Long poiId) {
        POI poi = findPoi(poiId);

        if (planItemRepository.existsByPoiId(poiId)) {
            throw new BadRequestException(
                    "POI cannot be deleted because it is used by a plan item"
            );
        }

        poiRepository.delete(poi);
    }

    private PoiResponse createPoi(
            CreatePoiRequest request
    ) {
        POI poi = new POI(
                request.getExternalPlaceId().trim(),
                request.getName().trim(),
                normalizeOptionalText(request.getAddress()),
                request.getCity().trim(),
                normalizeCountryCode(
                        request.getCountryCode()
                ),
                normalizeOptionalText(request.getCategory()),
                request.getLatitude(),
                request.getLongitude(),
                request.getRating()
        );

        poi.setImageUrl(
                normalizeOptionalText(request.getImageUrl())
        );

        POI savedPoi = poiRepository.save(poi);

        return toResponse(savedPoi);
    }

    private POI findPoi(Long poiId) {
        return poiRepository.findById(poiId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "POI not found with id: " + poiId
                        )
                );
    }

    private String normalizeCountryCode(
            String countryCode
    ) {
        return countryCode
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    private String normalizeOptionalText(String text) {
        if (text == null) {
            return null;
        }

        String trimmedText = text.trim();

        return trimmedText.isEmpty()
                ? null
                : trimmedText;
    }

    private PoiResponse toResponse(POI poi) {
        return new PoiResponse(
                poi.getId(),
                poi.getExternalPlaceId(),
                poi.getName(),
                poi.getAddress(),
                poi.getCity(),
                poi.getCountryCode(),
                poi.getCategory(),
                poi.getLatitude(),
                poi.getLongitude(),
                poi.getRating(),
                poi.getImageUrl(),
                poi.getCreatedAt(),
                poi.getUpdatedAt()
        );
    }
}