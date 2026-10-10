package com.travelplanner.exception;

public class RouteUnavailableException extends RuntimeException {
    public RouteUnavailableException(String message) {
        super(message);
    }

    public RouteUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
