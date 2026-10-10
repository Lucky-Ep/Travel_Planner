package com.travelplanner.config;

import com.travelplanner.entity.POI;
import com.travelplanner.entity.User;
import com.travelplanner.repository.POIRepository;
import com.travelplanner.repository.UserRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("dev")
public class DevelopmentDataSeeder {

    @Bean
    ApplicationRunner seedDevelopmentData(UserRepository users, POIRepository pois) {
        return args -> {
            users.findByEmail("demo@travelplanner.com")
                    .orElseGet(() -> users.save(new User(
                            "demo@travelplanner.com",
                            "mock-auth-only",
                            "Demo User"
                    )));

            seedPoi(pois, "poi-the-bund", "The Bund",
                    "Zhongshan East 1st Road, Huangpu, Shanghai", "Landmark",
                    31.24, 121.49, 4.7,
                    "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/The_Bund_2.jpg/330px-The_Bund_2.jpg");
            seedPoi(pois, "poi-yu-garden", "Yu Garden",
                    "279 Yuyuan Old Street, Huangpu, Shanghai", "Garden",
                    31.2272, 121.4921, 4.5,
                    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Shanghai_-_Yu_Garden_-_0035.jpg/330px-Shanghai_-_Yu_Garden_-_0035.jpg");
            seedPoi(pois, "poi-shanghai-museum", "Shanghai Museum",
                    "201 People's Avenue, Huangpu, Shanghai", "Culture",
                    31.2303, 121.47, 4.6,
                    "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Shanghai_Museum_exterior_1.jpg/330px-Shanghai_Museum_exterior_1.jpg");
            seedPoi(pois, "poi-oriental-pearl", "Oriental Pearl Tower",
                    "1 Century Avenue, Pudong, Shanghai", "Landmark",
                    31.2397, 121.4998, 4.5,
                    "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Oriental_Pearl_Tower_20251126.jpg/330px-Oriental_Pearl_Tower_20251126.jpg");
            seedPoi(pois, "poi-wukang-mansion", "Wukang Mansion",
                    "1850 Huaihai Middle Road, Xuhui, Shanghai", "Landmark",
                    31.2026, 121.4387, 4.6,
                    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Wukang_Mansion_20251128.jpg/330px-Wukang_Mansion_20251128.jpg");
            seedPoi(pois, "poi-xintiandi", "Xintiandi",
                    "Lane 181, Taicang Road, Huangpu, Shanghai", "Shopping",
                    31.2192, 121.4753, 4.4,
                    "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/Xintiandi5.jpg/330px-Xintiandi5.jpg");
            seedPoi(pois, "poi-tianzifang", "Tianzifang",
                    "210 Taikang Road, Huangpu, Shanghai", "Food",
                    31.208, 121.468, 4.2,
                    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Shanghai_Tianzifang_%E4%B8%8A%E6%B5%B7%E7%94%B0%E5%AD%90%E5%9D%8A_-_panoramio.jpg/330px-Shanghai_Tianzifang_%E4%B8%8A%E6%B5%B7%E7%94%B0%E5%AD%90%E5%9D%8A_-_panoramio.jpg");
            seedPoi(pois, "poi-disneyland", "Shanghai Disneyland",
                    "310 Huangzhao Road, Pudong, Shanghai", "Theme Park",
                    31.1434, 121.657, 4.7,
                    "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Shanghai_Disneyland_Enchanted_Storybook_Castle.jpg/960px-Shanghai_Disneyland_Enchanted_Storybook_Castle.jpg");
        };
    }

    private void seedPoi(POIRepository pois, String externalId, String name,
                         String address, String category, double latitude,
                         double longitude, double rating, String imageUrl) {
        POI existing = pois.findByExternalPlaceId(externalId).orElse(null);
        if (existing != null) {
            String currentImageUrl = existing.getImageUrl();
            if (currentImageUrl == null || currentImageUrl.isBlank()
                    || currentImageUrl.startsWith("/pois/")) {
                existing.setImageUrl(imageUrl);
                pois.save(existing);
            }
            return;
        }
        POI poi = new POI(externalId, name, address, "Shanghai", "CN",
                category, latitude, longitude, rating);
        poi.setImageUrl(imageUrl);
        pois.save(poi);
    }
}
