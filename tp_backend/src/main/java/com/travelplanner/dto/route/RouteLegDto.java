package com.travelplanner.dto.route;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteLegDto {
    private Long fromPoiId;
    private String fromPoiName;
    private Long toPoiId;
    private String toPoiName;

    private Long distanceMeters;     // 距离（数值，方便计算）
    private String distanceText;      // 距离显示（如 "3.2 km"）

    private Long durationSeconds;    // 耗时（数值，方便计算）
    private String durationText;     // 耗时显示（如 "15 mins"）

}