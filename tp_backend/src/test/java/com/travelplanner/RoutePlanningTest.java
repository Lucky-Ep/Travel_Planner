package com.travelplanner;

import com.travelplanner.controller.RouteController;
import com.travelplanner.dto.route.RouteLegDto;
import com.travelplanner.dto.route.RouteResponseDto;
import com.travelplanner.entity.POI;
import com.travelplanner.entity.PlanItem;
import com.travelplanner.repository.PlanItemRepository;
import com.travelplanner.repository.TripDayRepository;
import com.travelplanner.service.RoutePlanningServiceImpl;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

public class RoutePlanningTest {

    @Disabled("Calls live Google Directions and may incur costs; run main() manually with GOOGLE_MAPS_API_KEY.")
    @Test
    public void testRealBackendApiCall() throws Exception {
        runRealBackendTest();
    }

    public static void main(String[] args) throws Exception {
        new RoutePlanningTest().runRealBackendTest();
    }

    public void runRealBackendTest() throws Exception {
        String apiKey = System.getenv("GOOGLE_MAPS_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "Set GOOGLE_MAPS_API_KEY before manually running the live Google test.");
        }
        System.out.println("==========================================================================");
        System.out.println("【1. 准备后端数据库数据（3个真实巴黎景点）】");
        System.out.println("==========================================================================");

        Long dayId = 1L;

        // 模拟数据库中的 POI 数据
        POI poi1 = new POI();
        poi1.setName("Musée du Louvre (卢浮宫)");
        poi1.setLatitude(48.8606);
        poi1.setLongitude(2.3376);
        setField(poi1, "id", 101L);

        POI poi2 = new POI();
        poi2.setName("Palais Garnier (巴黎歌剧院)");
        poi2.setLatitude(48.8719);
        poi2.setLongitude(2.3316);
        setField(poi2, "id", 102L);

        POI poi3 = new POI();
        poi3.setName("Arc de Triomphe (凯旋门)");
        poi3.setLatitude(48.8738);
        poi3.setLongitude(2.2950);
        setField(poi3, "id", 103L);

        // 模拟当天的行程项 PlanItem
        PlanItem item1 = new PlanItem();
        item1.setPoi(poi1);
        item1.setVisitOrder(1);

        PlanItem item2 = new PlanItem();
        item2.setPoi(poi2);
        item2.setVisitOrder(2);

        PlanItem item3 = new PlanItem();
        item3.setPoi(poi3);
        item3.setVisitOrder(3);

        List<PlanItem> mockPlans = List.of(item1, item2, item3);

        // 2. 模拟 Repository 返回这 3 个景点
        PlanItemRepository mockPlanItemRepo = Mockito.mock(PlanItemRepository.class);
        TripDayRepository mockTripDayRepo = Mockito.mock(TripDayRepository.class);
        when(mockPlanItemRepo.findByTripDayIdOrderByVisitOrderAsc(dayId)).thenReturn(mockPlans);

        // 3. 实例化你真实的后端业务服务（RoutePlanningServiceImpl）
        RoutePlanningServiceImpl routePlanningService = new RoutePlanningServiceImpl(mockPlanItemRepo, mockTripDayRepo);
        // 注入真实的 Google Maps API Key
        ReflectionTestUtils.setField(routePlanningService, "apiKey", apiKey);

        // 4. 实例化你真实的控制器（RouteController）
        RouteController routeController = new RouteController(routePlanningService);

        System.out.println("已完成后端组件装配：RouteController -> RoutePlanningServiceImpl");
        System.out.println("正在发起真实网络请求，调用 Google Maps API 规划路线...\n");

        // 5. 真实调用后端 Controller 接口！
        long startTime = System.currentTimeMillis();
        ResponseEntity<RouteResponseDto> responseEntity = routeController.getRouteForDay(dayId);
        long elapsed = System.currentTimeMillis() - startTime;

        System.out.println("==========================================================================");
        System.out.println("【2. 后端真实调用成功！】HTTP Status: " + responseEntity.getStatusCode() + "，网络耗时: " + elapsed + " ms");
        System.out.println("==========================================================================");

        RouteResponseDto responseDto = responseEntity.getBody();
        assertNotNull(responseDto, "返回的 DTO 不应为空");

        // 6. 打印最终返回给前端的完整 JSON 数据
        System.out.println("\n==========================================================================");
        System.out.println("【3. 最终返回给前端 MapLibre 的真实完整 JSON 报文（经由真实 Google API 计算）】");
        System.out.println("==========================================================================");
        ObjectMapper objectMapper = new ObjectMapper();
        String jsonOutput = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(responseDto);
        System.out.println(jsonOutput);
    }

    @Test
    public void testEdgeCaseSinglePoiAndNullCoords() {
        PlanItemRepository mockPlanItemRepo = Mockito.mock(PlanItemRepository.class);
        TripDayRepository mockTripDayRepo = Mockito.mock(TripDayRepository.class);

        // 模拟只有 1 个正常 POI 和 1 个经纬度为 null 的异常 POI
        POI validPoi = new POI();
        validPoi.setName("Only One Valid POI");
        validPoi.setLatitude(48.8606);
        validPoi.setLongitude(2.3376);

        POI invalidPoi = new POI();
        invalidPoi.setName("Invalid POI without LatLng");
        invalidPoi.setLatitude(null);
        invalidPoi.setLongitude(null);

        PlanItem item1 = new PlanItem();
        item1.setPoi(validPoi);
        PlanItem item2 = new PlanItem();
        item2.setPoi(invalidPoi);

        when(mockPlanItemRepo.findByTripDayIdOrderByVisitOrderAsc(99L)).thenReturn(List.of(item1, item2));

        RoutePlanningServiceImpl service = new RoutePlanningServiceImpl(mockPlanItemRepo, mockTripDayRepo);
        RouteResponseDto result = service.planRouteForDay(99L);

        // 验证优化点 2 & 4：过滤后只剩 1 个有效 POI，应返回结构完整且 legs 不为 null 的友好空结果
        assertNotNull(result);
        assertEquals(99L, result.getDayId());
        assertEquals(0L, result.getTotalDistanceMeters());
        assertEquals(0L, result.getTotalDurationSeconds());
        assertNotNull(result.getLegs());
        assertTrue(result.getLegs().isEmpty());
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
