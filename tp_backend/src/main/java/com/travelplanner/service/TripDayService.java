package com.travelplanner.service;

import com.travelplanner.dto.tripday.CreateTripDayRequest;
import com.travelplanner.dto.tripday.TripDayResponse;
import com.travelplanner.dto.tripday.UpdateTripDayRequest;
import com.travelplanner.entity.Trip;
import com.travelplanner.entity.TripDay;
import com.travelplanner.exception.BadRequestException;
import com.travelplanner.exception.ResourceNotFoundException;
import com.travelplanner.repository.PlanItemRepository;
import com.travelplanner.repository.TripDayRepository;
import com.travelplanner.repository.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class TripDayService {

    private final TripRepository tripRepository;
    private final TripDayRepository tripDayRepository;
    private final PlanItemRepository planItemRepository;

    public TripDayService(
            TripRepository tripRepository,
            TripDayRepository tripDayRepository,
            PlanItemRepository planItemRepository
    ) {
        this.tripRepository = tripRepository;
        this.tripDayRepository = tripDayRepository;
        this.planItemRepository = planItemRepository;
    }

    @Transactional
    public TripDayResponse createTripDay(
            Long userId,
            Long tripId,
            CreateTripDayRequest request
    ) {
        Trip trip = findTripOwnedByUser(userId, tripId);

        validateTripDay(
                trip,
                request.getDayIndex(),
                request.getDate()
        );

        ensureDayIndexIsAvailable(
                tripId,
                request.getDayIndex(),
                null
        );

        TripDay tripDay = new TripDay(
                trip,
                request.getDayIndex(),
                request.getDate()
        );

        TripDay savedTripDay =
                tripDayRepository.save(tripDay);

        return toResponse(savedTripDay);
    }

    @Transactional(readOnly = true)
    public List<TripDayResponse> getTripDays(
            Long userId,
            Long tripId
    ) {
        findTripOwnedByUser(userId, tripId);

        return tripDayRepository
                .findByTripIdOrderByDayIndexAsc(tripId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TripDayResponse getTripDay(
            Long userId,
            Long tripId,
            Long dayId
    ) {
        findTripOwnedByUser(userId, tripId);

        TripDay tripDay = findTripDay(tripId, dayId);

        return toResponse(tripDay);
    }

    @Transactional
    public TripDayResponse updateTripDay(
            Long userId,
            Long tripId,
            Long dayId,
            UpdateTripDayRequest request
    ) {
        Trip trip = findTripOwnedByUser(userId, tripId);
        TripDay tripDay = findTripDay(tripId, dayId);

        validateTripDay(
                trip,
                request.getDayIndex(),
                request.getDate()
        );

        ensureDayIndexIsAvailable(
                tripId,
                request.getDayIndex(),
                dayId
        );

        tripDay.setDayIndex(request.getDayIndex());
        tripDay.setDate(request.getDate());

        TripDay updatedTripDay =
                tripDayRepository.save(tripDay);

        return toResponse(updatedTripDay);
    }

    @Transactional
    public void deleteTripDay(
            Long userId,
            Long tripId,
            Long dayId
    ) {
        findTripOwnedByUser(userId, tripId);
        TripDay tripDay = findTripDay(tripId, dayId);

        planItemRepository.deleteByTripDayId(dayId);
        planItemRepository.flush();

        tripDayRepository.delete(tripDay);
    }

    private Trip findTripOwnedByUser(
            Long userId,
            Long tripId
    ) {
        return tripRepository
                .findByIdAndUserId(tripId, userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Trip not found with id "
                                        + tripId
                                        + " for user "
                                        + userId
                        )
                );
    }

    private TripDay findTripDay(
            Long tripId,
            Long dayId
    ) {
        return tripDayRepository
                .findByIdAndTripId(dayId, tripId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Trip day not found with id "
                                        + dayId
                                        + " for trip "
                                        + tripId
                        )
                );
    }

    private void validateTripDay(
            Trip trip,
            Integer dayIndex,
            LocalDate date
    ) {
        if (dayIndex == null || date == null) {
            throw new BadRequestException(
                    "Day index and date are required"
            );
        }

        if (date.isBefore(trip.getStartDate())
                || date.isAfter(trip.getEndDate())) {
            throw new BadRequestException(
                    "Trip day date must be within the trip date range"
            );
        }

        LocalDate expectedDate =
                trip.getStartDate().plusDays(dayIndex);

        if (!date.equals(expectedDate)) {
            throw new BadRequestException(
                    "Trip day date must match its day index"
            );
        }
    }

    private void ensureDayIndexIsAvailable(
            Long tripId,
            Integer dayIndex,
            Long currentDayId
    ) {
        boolean duplicateExists =
                tripDayRepository
                        .findByTripIdOrderByDayIndexAsc(tripId)
                        .stream()
                        .anyMatch(existingDay ->
                                existingDay
                                        .getDayIndex()
                                        .equals(dayIndex)
                                        && (
                                        currentDayId == null
                                                || !existingDay
                                                .getId()
                                                .equals(currentDayId)
                                )
                        );

        if (duplicateExists) {
            throw new BadRequestException(
                    "Day index "
                            + dayIndex
                            + " already exists for trip "
                            + tripId
            );
        }
    }

    private TripDayResponse toResponse(TripDay tripDay) {
        return new TripDayResponse(
                tripDay.getId(),
                tripDay.getTrip().getId(),
                tripDay.getDayIndex(),
                tripDay.getDate()
        );
    }
}