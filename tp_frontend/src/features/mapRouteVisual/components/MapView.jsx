import {
  APIProvider,
  Map,
} from "@vis.gl/react-google-maps";

function MapRouteView() {
  return (
    <APIProvider
      apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
    >
      <div
        style={{
          width: "100%",
          height: "600px",
        }}
      >
        <Map
          defaultCenter={{
            lat: 35.6762,
            lng: 139.6503,
          }}
          defaultZoom={12}
        />
      </div>
    </APIProvider>
  );
}

export default MapRouteView;