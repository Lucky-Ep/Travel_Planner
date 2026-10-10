// Google encoded polylines use latitude/longitude pairs; MapLibre uses longitude/latitude.
export function decodePolyline(encoded) {
  if (!encoded) return [];
  const coordinates = [];
  let latitude = 0;
  let longitude = 0;
  let index = 0;

  function readValue() {
    let shift = 0;
    let result = 0;
    let chunk;
    do {
      if (index >= encoded.length || shift > 30) throw new Error('Invalid route polyline');
      chunk = encoded.charCodeAt(index++) - 63;
      result |= (chunk & 0x1f) << shift;
      shift += 5;
    } while (chunk >= 0x20);
    return (result & 1) ? ~(result >> 1) : result >> 1;
  }

  while (index < encoded.length) {
    latitude += readValue();
    longitude += readValue();
    coordinates.push([longitude / 1e5, latitude / 1e5]);
  }
  return coordinates;
}
