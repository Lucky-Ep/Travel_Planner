package com.travelplanner.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PolylineCodecTest {
    @Test
    void decodesAndReencodesGoogleExample() {
        String encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
        List<int[]> points = PolylineCodec.decode(encoded);
        assertEquals(3, points.size());
        assertArrayEquals(new int[]{3850000, -12020000}, points.get(0));
        assertEquals(encoded, PolylineCodec.encode(points));
    }
}
