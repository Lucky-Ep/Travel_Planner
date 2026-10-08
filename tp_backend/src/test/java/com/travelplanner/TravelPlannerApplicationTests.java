package com.travelplanner;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "google.maps.api-key=test-placeholder-not-a-real-key")
class TravelPlannerApplicationTests {

    @Test
    void contextLoads() {
    }

}
