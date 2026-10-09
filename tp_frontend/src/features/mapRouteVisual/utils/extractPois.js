export function extractPois(routeData) {
  const poiMap = new Map();

  routeData.legs.forEach((leg) => {
    poiMap.set(leg.fromPoiId, {
      id: leg.fromPoiId,
      name: leg.fromPoiName,
      location: leg.fromLocation,
    });

    poiMap.set(leg.toPoiId, {
      id: leg.toPoiId,
      name: leg.toPoiName,
      location: leg.toLocation,
    });
  });

  return Array.from(poiMap.values());
}