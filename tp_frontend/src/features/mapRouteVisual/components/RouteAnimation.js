import polyline from "@mapbox/polyline";

function getRouteCoordinates(routeData) {
  const coordinates = [];

  routeData.legs.forEach((leg) => {
    if (!leg.polyline) return;

    const decoded = polyline.decode(leg.polyline);

    decoded.forEach(([lat, lng]) => {
      const coordinate = [lng, lat];
      const lastCoordinate = coordinates[coordinates.length - 1];

      if (
        !lastCoordinate ||
        lastCoordinate[0] !== coordinate[0] ||
        lastCoordinate[1] !== coordinate[1]
      ) {
        coordinates.push(coordinate);
      }
    });
  });

  return coordinates;
}


// Calculate distance between two coordinates in meters
function getDistance(start, end) {
  const earthRadius = 6371000;

  const lat1 = (start[1] * Math.PI) / 180;
  const lat2 = (end[1] * Math.PI) / 180;

  const deltaLat =
    ((end[1] - start[1]) * Math.PI) / 180;

  const deltaLng =
    ((end[0] - start[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


// Build cumulative distance information
function buildRouteSegments(coordinates) {
  const segments = [];

  let totalDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];

    const distance = getDistance(start, end);

    segments.push({
      start,
      end,
      startDistance: totalDistance,
      endDistance: totalDistance + distance,
    });

    totalDistance += distance;
  }

  return {
    segments,
    totalDistance,
  };
}


// Find the coordinate at a specific distance along the route
function getCoordinateAtDistance(
  segments,
  targetDistance
) {
  if (segments.length === 0) {
    return null;
  }

  for (const segment of segments) {
    if (targetDistance <= segment.endDistance) {
      const segmentDistance =
        segment.endDistance - segment.startDistance;

      const progress =
        segmentDistance === 0
          ? 0
          : (targetDistance -
              segment.startDistance) /
            segmentDistance;

      const lng =
        segment.start[0] +
        (segment.end[0] - segment.start[0]) *
          progress;

      const lat =
        segment.start[1] +
        (segment.end[1] - segment.start[1]) *
          progress;

      return [lng, lat];
    }
  }

  return segments[segments.length - 1].end;
}


// Build the visible part of the route
function getVisibleCoordinates(
  coordinates,
  segments,
  targetDistance
) {
  const visibleCoordinates = [coordinates[0]];

  for (const segment of segments) {
    if (segment.endDistance <= targetDistance) {
      visibleCoordinates.push(segment.end);
      continue;
    }

    if (
      targetDistance >= segment.startDistance &&
      targetDistance < segment.endDistance
    ) {
      const segmentDistance =
        segment.endDistance - segment.startDistance;

      const progress =
        segmentDistance === 0
          ? 0
          : (targetDistance - segment.startDistance) /
            segmentDistance;

      const lng =
        segment.start[0] +
        (segment.end[0] - segment.start[0]) *
          progress;

      const lat =
        segment.start[1] +
        (segment.end[1] - segment.start[1]) *
          progress;

      visibleCoordinates.push([lng, lat]);

      break;
    }
  }

  return visibleCoordinates;
}


export function addRouteAnimation(map, routeData) {
  const coordinates = getRouteCoordinates(routeData);

  if (coordinates.length < 2) {
    return null;
  }

  const { segments, totalDistance } =
    buildRouteSegments(coordinates);


  // Animated route source
  map.addSource("animated-route", {
    type: "geojson",

    data: {
      type: "Feature",
      properties: {},

      geometry: {
        type: "LineString",
        coordinates: [coordinates[0]],
      },
    },
  });


  // Animated route layer
  map.addLayer({
    id: "animated-route-line",
    type: "line",
    source: "animated-route",

    layout: {
      "line-join": "round",
      "line-cap": "round",
    },

    paint: {
      "line-color": "#111827",
      "line-width": 7,
      "line-opacity": 1,
    },
  });


  // Traveler source
  map.addSource("traveler", {
    type: "geojson",

    data: {
      type: "Feature",
      properties: {},

      geometry: {
        type: "Point",
        coordinates: coordinates[0],
      },
    },
  });


  // Traveler layer
  map.addLayer({
    id: "traveler-point",
    type: "circle",
    source: "traveler",

    paint: {
      "circle-radius": 8,
      "circle-color": "#ffffff",
      "circle-stroke-color": "#111827",
      "circle-stroke-width": 4,
    },
  });


  // Animation state
  const animationDuration = 10000;

  let startTime = null;
  let elapsedBeforePause = 0;

  let animationFrame = null;
  let isPlaying = false;
  let isDestroyed = false;


  function update(progress) {
    const targetDistance =
      totalDistance * progress;

    const travelerCoordinate =
      getCoordinateAtDistance(
        segments,
        targetDistance
      );

    const visibleCoordinates =
      getVisibleCoordinates(
        coordinates,
        segments,
        targetDistance
      );

    const routeSource =
      map.getSource("animated-route");

    const travelerSource =
      map.getSource("traveler");


    if (routeSource) {
      routeSource.setData({
        type: "Feature",
        properties: {},

        geometry: {
          type: "LineString",
          coordinates: visibleCoordinates,
        },
      });
    }


    if (travelerSource && travelerCoordinate) {
      travelerSource.setData({
        type: "Feature",
        properties: {},

        geometry: {
          type: "Point",
          coordinates: travelerCoordinate,
        },
      });
    }
  }


  function animate(timestamp) {
    if (!isPlaying) return;

    if (startTime === null) {
      startTime = timestamp;
    }

    const elapsed =
      elapsedBeforePause +
      (timestamp - startTime);

    const progress = Math.min(
      elapsed / animationDuration,
      1
    );

    update(progress);


    if (progress >= 1) {
      isPlaying = false;
      animationFrame = null;
      return;
    }


    animationFrame =
      requestAnimationFrame(animate);
  }


  function play() {
    if (isPlaying || isDestroyed) return;

    if (
      elapsedBeforePause >=
      animationDuration
    ) {
      elapsedBeforePause = 0;
      update(0);
    }

    isPlaying = true;
    startTime = null;

    animationFrame =
      requestAnimationFrame(animate);
  }


  function pause() {
    if (!isPlaying) return;

    isPlaying = false;

    if (startTime !== null) {
      elapsedBeforePause +=
        performance.now() - startTime;
    }

    startTime = null;


    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }


  function restart() {
    if (isDestroyed) return;

    isPlaying = false;

    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    startTime = null;
    elapsedBeforePause = 0;

    update(0);

    play();
  }


  function destroy() {
    if (isDestroyed) return;

    isDestroyed = true;
    isPlaying = false;

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    if (map.getLayer("traveler-point")) {
      map.removeLayer("traveler-point");
    }

    if (map.getSource("traveler")) {
      map.removeSource("traveler");
    }

    if (map.getLayer("animated-route-line")) {
      map.removeLayer("animated-route-line");
    }

    if (map.getSource("animated-route")) {
      map.removeSource("animated-route");
    }
  }


  update(0);


  return {
    play,
    pause,
    restart,
    destroy,
  };
}
