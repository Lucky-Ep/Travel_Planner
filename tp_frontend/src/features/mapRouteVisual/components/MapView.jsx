import { useEffect, useRef, useState } from "react";
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import mockRouteData from "../data/mockRouteData";
import { raster2DStyle, vector3DStyle } from "../config/mapStyles";
import { fitRouteBounds } from "../utils/fitRouteBounds";
import { add3DBuildings } from "./Buildings3D";
import { addPoiMarkers } from "./PoiMarkers";
import { addRouteAnimation } from "./RouteAnimation";
import { addRouteInteraction } from "./RouteInteraction";
import { addRouteLayer } from "./RouteLayer";

function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const animationController = useRef(null);
  const poiMarkers = useRef([]);
  const routeInteractionCleanup = useRef(null);
  const requestedMode = useRef("2d");
  const styleRequestId = useRef(0);
  const [viewMode, setViewMode] = useState("2d");

  function removeTravelLayers() {
    poiMarkers.current.forEach((marker) => marker.remove());
    poiMarkers.current = [];
    routeInteractionCleanup.current?.();
    routeInteractionCleanup.current = null;
    animationController.current?.destroy();
    animationController.current = null;

    const currentMap = map.current;

    if (!currentMap) return;
    if (currentMap.getLayer("route-legs-line")) {
      currentMap.removeLayer("route-legs-line");
    }
    if (currentMap.getSource("route-legs")) {
      currentMap.removeSource("route-legs");
    }
  }

  function addTravelLayers() {
    const currentMap = map.current;

    if (!currentMap) return;

    addRouteLayer(currentMap, mockRouteData);
    poiMarkers.current = addPoiMarkers(currentMap, mockRouteData);
    routeInteractionCleanup.current = addRouteInteraction(currentMap);
    animationController.current = addRouteAnimation(
      currentMap,
      mockRouteData
    );
  }

  function finishModeSwitch(currentMap, mode, requestId) {
    if (
      requestId !== styleRequestId.current ||
      requestedMode.current !== mode ||
      map.current !== currentMap
    ) {
      return;
    }

    if (mode === "3d") add3DBuildings(currentMap);

    addTravelLayers();
    fitRouteBounds(currentMap, mockRouteData);
    currentMap.easeTo({
      pitch: mode === "3d" ? 60 : 0,
      bearing: mode === "3d" ? -20 : 0,
      duration: 1000,
    });
  }

  function switchMapMode(mode) {
    const currentMap = map.current;

    if (!currentMap || requestedMode.current === mode) return;

    requestedMode.current = mode;
    setViewMode(mode);

    const requestId = ++styleRequestId.current;

    removeTravelLayers();
    currentMap.once("style.load", () => {
      finishModeSwitch(currentMap, mode, requestId);
    });
    currentMap.setStyle(
      mode === "3d" ? vector3DStyle : raster2DStyle
    );
  }

  useEffect(() => {
    if (map.current) return;

    map.current = new Map({
      container: mapContainer.current,
      style: raster2DStyle,
      center: [0, 0],
      zoom: 2,
    });

    map.current.on("load", () => {
      addTravelLayers();
      fitRouteBounds(map.current, mockRouteData);
    });

    return () => {
      styleRequestId.current += 1;
      removeTravelLayers();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <button
          onClick={() => switchMapMode("2d")}
          disabled={viewMode === "2d"}
        >
          2D
        </button>
        <button
          onClick={() => switchMapMode("3d")}
          disabled={viewMode === "3d"}
        >
          3D
        </button>
      </div>

      <div
        ref={mapContainer}
        style={{ width: "100%", height: "600px" }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        <button onClick={() => animationController.current?.play()}>
          Play
        </button>
        <button onClick={() => animationController.current?.pause()}>
          Pause
        </button>
        <button onClick={() => animationController.current?.restart()}>
          Restart
        </button>
      </div>
    </div>
  );
}

export default MapView;
