package com.travelplanner.service;

import com.travelplanner.dto.planitem.CreatePlanItemRequest;
import com.travelplanner.dto.planitem.PlanItemResponse;
import com.travelplanner.dto.planitem.UpdatePlanItemRequest;
import com.travelplanner.entity.POI;
import com.travelplanner.entity.PlanItem;
import com.travelplanner.entity.Trip;
import com.travelplanner.entity.TripDay;
import com.travelplanner.exception.BadRequestException;
import com.travelplanner.exception.ResourceNotFoundException;
import com.travelplanner.repository.POIRepository;
import com.travelplanner.repository.PlanItemRepository;
import com.travelplanner.repository.TripDayRepository;
import com.travelplanner.repository.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalTime;

import java.util.List;

@Service
public class PlanItemService {

    private final TripRepository tripRepository;
    private final TripDayRepository tripDayRepository;
    private final POIRepository poiRepository;
    private final PlanItemRepository planItemRepository;

    public PlanItemService(
            TripRepository tripRepository,
            TripDayRepository tripDayRepository,
            POIRepository poiRepository,
            PlanItemRepository planItemRepository
    ) {
        this.tripRepository = tripRepository;
        this.tripDayRepository = tripDayRepository;
        this.poiRepository = poiRepository;
        this.planItemRepository = planItemRepository;
    }

    @Transactional
    public PlanItemResponse createPlanItem(
            Long userId,
            Long tripId,
            Long dayId,
            CreatePlanItemRequest request
    ) {
        TripDay tripDay =
                findTripDayOwnedByUser(
                        userId,
                        tripId,
                        dayId
                );

        POI poi = findPoi(request.getPoiId());

        validateReminder(
                request.getScheduledTime(),
                request.getReminderMinutesBefore()
        );

        ensureVisitOrderIsAvailable(
                dayId,
                request.getVisitOrder(),
                null
        );

        PlanItem planItem = new PlanItem(
                tripDay,
                poi,
                request.getVisitOrder(),
                request.getScheduledTime(),
                request.getDurationMinutes(),
                normalizeNote(request.getNote()),
                request.getReminderMinutesBefore()
        );

        PlanItem savedPlanItem =
                planItemRepository.save(planItem);

        return toResponse(savedPlanItem);
    }

    @Transactional(readOnly = true)
    public List<PlanItemResponse> getPlanItems(
            Long userId,
            Long tripId,
            Long dayId
    ) {
        findTripDayOwnedByUser(
                userId,
                tripId,
                dayId
        );

        return planItemRepository
                .findByTripDayIdOrderByVisitOrderAsc(dayId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PlanItemResponse getPlanItem(
            Long userId,
            Long tripId,
            Long dayId,
            Long planItemId
    ) {
        findTripDayOwnedByUser(
                userId,
                tripId,
                dayId
        );

        PlanItem planItem =
                findPlanItem(dayId, planItemId);

        return toResponse(planItem);
    }

    @Transactional
    public PlanItemResponse updatePlanItem(
            Long userId,
            Long tripId,
            Long dayId,
            Long planItemId,
            UpdatePlanItemRequest request
    ) {
        findTripDayOwnedByUser(
                userId,
                tripId,
                dayId
        );

        PlanItem planItem =
                findPlanItem(dayId, planItemId);

        POI poi = findPoi(request.getPoiId());

        validateReminder(
                request.getScheduledTime(),
                request.getReminderMinutesBefore()
        );

        ensureVisitOrderIsAvailable(
                dayId,
                request.getVisitOrder(),
                planItemId
        );

        planItem.setPoi(poi);
        planItem.setVisitOrder(request.getVisitOrder());
        planItem.setScheduledTime(request.getScheduledTime());
        planItem.setDurationMinutes(
                request.getDurationMinutes()
        );
        planItem.setNote(
                normalizeNote(request.getNote())
        );
        planItem.setReminderMinutesBefore(
                request.getReminderMinutesBefore()
        );

        PlanItem updatedPlanItem =
                planItemRepository.save(planItem);

        return toResponse(updatedPlanItem);
    }

    @Transactional
    public void deletePlanItem(
            Long userId,
            Long tripId,
            Long dayId,
            Long planItemId
    ) {
        findTripDayOwnedByUser(
                userId,
                tripId,
                dayId
        );

        PlanItem planItem =
                findPlanItem(dayId, planItemId);

        planItemRepository.delete(planItem);
    }

    private TripDay findTripDayOwnedByUser(
            Long userId,
            Long tripId,
            Long dayId
    ) {
        Trip trip = tripRepository
                .findByIdAndUserId(tripId, userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Trip not found with id "
                                        + tripId
                                        + " for user "
                                        + userId
                        )
                );

        return tripDayRepository
                .findByIdAndTripId(dayId, trip.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Trip day not found with id "
                                        + dayId
                                        + " for trip "
                                        + tripId
                        )
                );
    }

    private POI findPoi(Long poiId) {
        return poiRepository.findById(poiId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "POI not found with id: " + poiId
                        )
                );
    }

    private PlanItem findPlanItem(
            Long dayId,
            Long planItemId
    ) {
        return planItemRepository
                .findByIdAndTripDayId(planItemId, dayId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Plan item not found with id "
                                        + planItemId
                                        + " for day "
                                        + dayId
                        )
                );
    }

    private void validateReminder(
            LocalTime scheduledTime,
            Integer reminderMinutesBefore
    ) {
        if (reminderMinutesBefore != null
                && scheduledTime == null) {
            throw new BadRequestException(
                    "Scheduled time is required when a reminder is set"
            );
        }
    }

    private void ensureVisitOrderIsAvailable(
            Long dayId,
            Integer visitOrder,
            Long currentPlanItemId
    ) {
        boolean duplicateExists =
                planItemRepository
                        .findByTripDayIdOrderByVisitOrderAsc(dayId)
                        .stream()
                        .anyMatch(existingItem ->
                                existingItem
                                        .getVisitOrder()
                                        .equals(visitOrder)
                                        && (
                                        currentPlanItemId == null
                                                || !existingItem
                                                .getId()
                                                .equals(currentPlanItemId)
                                )
                        );

        if (duplicateExists) {
            throw new BadRequestException(
                    "Visit order "
                            + visitOrder
                            + " already exists for day "
                            + dayId
            );
        }
    }

    private String normalizeNote(String note) {
        if (note == null) {
            return null;
        }

        String trimmedNote = note.trim();

        return trimmedNote.isEmpty()
                ? null
                : trimmedNote;
    }

    private PlanItemResponse toResponse(
            PlanItem planItem
    ) {
        POI poi = planItem.getPoi();

        return new PlanItemResponse(
                planItem.getId(),
                planItem.getTripDay().getId(),
                poi.getId(),
                poi.getName(),
                poi.getAddress(),
                poi.getCategory(),
                poi.getLatitude(),
                poi.getLongitude(),
                poi.getRating(),
                poi.getImageUrl(),
                planItem.getVisitOrder(),
                planItem.getScheduledTime(),
                planItem.getDurationMinutes(),
                planItem.getNote(),
                planItem.getReminderMinutesBefore()
        );
    }
}