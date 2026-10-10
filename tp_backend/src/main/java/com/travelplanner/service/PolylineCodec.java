package com.travelplanner.service;

import java.util.ArrayList;
import java.util.List;

/** Google encoded polyline coordinates are latitude/longitude pairs at 1e-5 precision. */
final class PolylineCodec {
    private PolylineCodec() {
    }

    static List<int[]> decode(String value) {
        List<int[]> points = new ArrayList<>();
        int latitude = 0;
        int longitude = 0;
        int index = 0;
        while (index < value.length()) {
            int[] lat = decodeValue(value, index);
            latitude += lat[0];
            index = lat[1];
            int[] lng = decodeValue(value, index);
            longitude += lng[0];
            index = lng[1];
            points.add(new int[]{latitude, longitude});
        }
        return points;
    }

    static String encode(List<int[]> points) {
        StringBuilder result = new StringBuilder();
        int latitude = 0;
        int longitude = 0;
        for (int[] point : points) {
            encodeValue(point[0] - latitude, result);
            encodeValue(point[1] - longitude, result);
            latitude = point[0];
            longitude = point[1];
        }
        return result.toString();
    }

    private static int[] decodeValue(String value, int start) {
        int result = 0;
        int shift = 0;
        int index = start;
        int chunk;
        do {
            if (index >= value.length() || shift > 30) {
                throw new IllegalArgumentException("Invalid encoded polyline");
            }
            chunk = value.charAt(index++) - 63;
            result |= (chunk & 0x1f) << shift;
            shift += 5;
        } while (chunk >= 0x20);
        int decoded = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
        return new int[]{decoded, index};
    }

    private static void encodeValue(int value, StringBuilder result) {
        int shifted = value < 0 ? ~(value << 1) : value << 1;
        while (shifted >= 0x20) {
            result.append((char) ((0x20 | (shifted & 0x1f)) + 63));
            shifted >>= 5;
        }
        result.append((char) (shifted + 63));
    }
}
