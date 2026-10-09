import { Popup } from "maplibre-gl";

export function addRouteInteraction(map) {
  let hoveredLegId = null;

  const popup = new Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
  });

  function handleMouseMove(event) {
    map.getCanvas().style.cursor = "pointer";

    const feature = event.features?.[0];

    if (!feature) return;

    if (hoveredLegId !== null) {
      map.setFeatureState(
        {
          source: "route-legs",
          id: hoveredLegId,
        },
        {
          hover: false,
        }
      );
    }

    hoveredLegId = feature.id;

    map.setFeatureState(
      {
        source: "route-legs",
        id: hoveredLegId,
      },
      {
        hover: true,
      }
    );

    const {
      fromPoiName,
      toPoiName,
      distanceText,
      durationText,
    } = feature.properties;

    popup
      .setLngLat(event.lngLat)
      .setHTML(`
        <div style="font-size: 14px;">
          <strong>
            ${fromPoiName} → ${toPoiName}
          </strong>

          <div style="margin-top: 4px;">
            ${distanceText} · ${durationText}
          </div>
        </div>
      `)
      .addTo(map);
  }

  function clearHoverState() {
    if (
      hoveredLegId !== null &&
      map.getSource("route-legs")
    ) {
      map.setFeatureState(
        {
          source: "route-legs",
          id: hoveredLegId,
        },
        {
          hover: false,
        }
      );
    }

    hoveredLegId = null;
  }

  function handleMouseLeave() {
    map.getCanvas().style.cursor = "";

    clearHoverState();
    popup.remove();
  }

  map.on("mousemove", "route-legs-line", handleMouseMove);
  map.on("mouseleave", "route-legs-line", handleMouseLeave);

  return function cleanupRouteInteraction() {
    map.off("mousemove", "route-legs-line", handleMouseMove);
    map.off("mouseleave", "route-legs-line", handleMouseLeave);
    map.getCanvas().style.cursor = "";
    clearHoverState();
    popup.remove();
  };
}
