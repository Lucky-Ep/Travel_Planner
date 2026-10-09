import { raster2DStyle, vector3DStyle } from "./mapStyles";

describe("map styles", () => {
  it("preserves the existing OSM raster style for 2D", () => {
    expect(raster2DStyle).toEqual({
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }],
    });
  });

  it("uses the OpenFreeMap Liberty vector style for 3D", () => {
    expect(vector3DStyle).toBe(
      "https://tiles.openfreemap.org/styles/liberty"
    );
  });
});
