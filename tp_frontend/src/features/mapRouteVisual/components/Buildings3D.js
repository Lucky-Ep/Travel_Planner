export const BUILDINGS_3D_LAYER_ID = "travel-buildings-3d";

function isVectorBuildingLayer(layer, sources) {
  return (
    layer.source &&
    layer["source-layer"] === "building" &&
    sources[layer.source]?.type === "vector"
  );
}

export function add3DBuildings(map) {
  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) {
    return BUILDINGS_3D_LAYER_ID;
  }

  const style = map.getStyle();
  const layers = style?.layers ?? [];
  const sources = style?.sources ?? {};
  const buildingLayers = layers.filter((layer) =>
    isVectorBuildingLayer(layer, sources)
  );
  const existingExtrusion = buildingLayers.find(
    (layer) => layer.type === "fill-extrusion"
  );

  if (existingExtrusion) {
    map.setLayerZoomRange(existingExtrusion.id, 13, 24);
    return existingExtrusion.id;
  }

  const buildingLayer = buildingLayers[0];

  if (!buildingLayer) {
    return null;
  }

  const firstLabelLayer = layers.find(
    (layer) =>
      layer.type === "symbol" && layer.layout?.["text-field"]
  );

  map.addLayer(
    {
      id: BUILDINGS_3D_LAYER_ID,
      type: "fill-extrusion",
      source: buildingLayer.source,
      "source-layer": buildingLayer["source-layer"],
      minzoom: 13,
      paint: {
        "fill-extrusion-color": "hsl(35,8%,85%)",
        "fill-extrusion-height": [
          "coalesce",
          ["get", "render_height"],
          ["get", "height"],
          12,
        ],
        "fill-extrusion-base": [
          "coalesce",
          ["get", "render_min_height"],
          ["get", "min_height"],
          0,
        ],
        "fill-extrusion-opacity": 0.8,
      },
    },
    firstLabelLayer?.id
  );

  return BUILDINGS_3D_LAYER_ID;
}
