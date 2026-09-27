import { Marker, Popup } from "maplibre-gl";
import { extractPois } from "../utils/extractPois";

export function addPoiMarkers(map, routeData) {
  const pois = extractPois(routeData);

  const markers = pois.map((poi, index) => {
    const markerElement = document.createElement("div");

    markerElement.className = "poi-marker";
    markerElement.textContent = index + 1;

    markerElement.style.width = "32px";
    markerElement.style.height = "32px";
    markerElement.style.borderRadius = "50%";
    markerElement.style.background = "white";
    markerElement.style.border = "3px solid black";
    markerElement.style.display = "flex";
    markerElement.style.alignItems = "center";
    markerElement.style.justifyContent = "center";
    markerElement.style.fontWeight = "bold";
    markerElement.style.cursor = "pointer";

    const popup = new Popup({
      offset: 20,
    }).setText(poi.name);

    const marker = new Marker({
      element: markerElement,
    })
      .setLngLat([
        poi.location.lng,
        poi.location.lat,
      ])
      .setPopup(popup)
      .addTo(map);

    return marker;
  });

  return markers;
}