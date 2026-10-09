import polyline from "@mapbox/polyline";

export function legsToGeoJSON(routeData) {
  const features = routeData.legs
    .filter((leg) => leg.polyline)
    .map((leg, index) => {
      const decodedCoordinates = polyline.decode(leg.polyline);

      const coordinates = decodedCoordinates.map(
        ([lat, lng]) => [lng, lat]
      );

      return {
        type: "Feature",

        id: index,

        properties: {
          legIndex: index,

          fromPoiId: leg.fromPoiId,
          fromPoiName: leg.fromPoiName,

          toPoiId: leg.toPoiId,
          toPoiName: leg.toPoiName,

          distanceMeters: leg.distanceMeters,
          distanceText: leg.distanceText,

          durationSeconds: leg.durationSeconds,
          durationText: leg.durationText,
        },

        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
      };
    });

  return {
    type: "FeatureCollection",
    features: features,
  };
}