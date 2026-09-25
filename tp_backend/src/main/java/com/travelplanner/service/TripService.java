package com.travelplanner.service;

import com.travelplanner.dto.trip.CreateTripRequest;
import com.travelplanner.dto.trip.TripResponse;
import com.travelplanner.dto.trip.UpdateTripRequest;
import com.travelplanner.entity.Trip;
import com.travelplanner.entity.TripDay;
import com.travelplanner.entity.User;
import com.travelplanner.exception.BadRequestException;
import com.travelplanner.exception.ResourceNotFoundException;
import com.travelplanner.repository.PlanItemRepository;
import com.travelplanner.repository.TripDayRepository;
import com.travelplanner.repository.TripRepository;
import com.travelplanner.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

@Service
public class TripService {

    private static final long MAX_TRIP_DAYS = 15;

    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final TripDayRepository tripDayRepository;
    private final PlanItemRepository planItemRepository;

    public TripService(
            UserRepository userRepository,
            TripRepository tripRepository,
            TripDayRepository tripDayRepository,
            PlanItemRepository planItemRepository
    ) {
        this.userRepository = userRepository;
        this.tripRepository = tripRepository;
        this.tripDayRepository = tripDayRepository;
        this.planItemRepository = planItemRepository;
    }

    @Transactional
    public TripResponse createTrip(
            Long userId,
            CreateTripRequest request
    ) {
        User user = findUser(userId);

        validateDateRange(
                request.getStartDate(),
                request.getEndDate()
        );

        Trip trip = new Trip(
                user,
                request.getName().trim(),
                request.getCity().trim(),
                normalizeCountryCode(request.getCountryCode()),
                request.getStartDate(),
                request.getEndDate()
        );

        Trip savedTrip = tripRepository.save(trip);

        return toResponse(savedTrip);
    }

    @Transactional(readOnly = true)
    public List<TripResponse> getTripsByUser(Long userId) {
        findUser(userId);

        return tripRepository
                .findByUserIdOrderByStartDateDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TripResponse getTrip(
            Long userId,
            Long tripId
    ) {
        Trip trip = findTripOwnedByUser(userId, tripId);
        return toResponse(trip);
    }

    @Transactional
    public TripResponse updateTrip(
            Long userId,
            Long tripId,
            UpdateTripRequest request
    ) {
        Trip trip = findTripOwnedByUser(userId, tripId);

        validateDateRange(
                request.getStartDate(),
                request.getEndDate()
        );

        trip.setName(request.getName().trim());
        trip.setCity(request.getCity().trim());
        trip.setCountryCode(
                normalizeCountryCode(request.getCountryCode())
        );
        trip.setStartDate(request.getStartDate());
        trip.setEndDate(request.getEndDate());

        Trip updatedTrip = tripRepository.save(trip);

        return toResponse(updatedTrip);
    }

    @Transactional
    public void deleteTrip(
            Long userId,
            Long tripId
    ) {
        Trip trip = findTripOwnedByUser(userId, tripId);

        List<TripDay> tripDays =
                tripDayRepository.findByTripIdOrderByDayIndexAsc(tripId);

        for (TripDay tripDay : tripDays) {
            planItemRepository.deleteByTripDayId(tripDay.getId());
        }

        planItemRepository.flush();

        tripDayRepository.deleteByTripId(tripId);
        tripDayRepository.flush();

        tripRepository.delete(trip);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found with id: " + userId
                        )
                );
    }

    private Trip findTripOwnedByUser(
            Long userId,
            Long tripId
    ) {
        findUser(userId);

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

    private void validateDateRange(
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (startDate == null || endDate == null) {
            throw new BadRequestException(
                    "Start date and end date are required"
            );
        }

        if (endDate.isBefore(startDate)) {
            throw new BadRequestException(
                    "End date must not be before start date"
            );
        }

        long tripDays =
                ChronoUnit.DAYS.between(startDate, endDate) + 1;

        if (tripDays > MAX_TRIP_DAYS) {
            throw new BadRequestException(
                    "Trip duration must not exceed "
                            + MAX_TRIP_DAYS
                            + " days"
            );
        }
    }

    private String normalizeCountryCode(String countryCode) {
        return countryCode
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    private TripResponse toResponse(Trip trip) {
        return new TripResponse(
                trip.getId(),
                trip.getUser().getId(),
                trip.getName(),
                trip.getCity(),
                trip.getCountryCode(),
                trip.getStartDate(),
                trip.getEndDate(),
                trip.getCreatedAt(),
                trip.getUpdatedAt()
        );
    }
}