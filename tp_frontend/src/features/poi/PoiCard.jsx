import { useEffect, useState } from "react";
import { getPoiPhoto } from "./photoService";

export default function PoiCard({ poi, selected, onToggle }) {
  const [photo, setPhoto] = useState({ imageUrl: poi.imageUrl });
  useEffect(() => {
    let active = true;
    setPhoto({ imageUrl: poi.imageUrl });

    void getPoiPhoto(poi.id, poi.name, poi.imageUrl).then((result) => {
      if (active) setPhoto(result);
    });

    return () => {
      active = false;
    };
  }, [poi.id, poi.name, poi.imageUrl]);

  return (
    <article className={`poi-card ${selected ? "is-selected" : ""}`}>
      <button
        className="poi-image-button"
        type="button"
        onClick={() => onToggle(poi.id)}
        aria-label={`${selected ? "Deselect" : "Select"} ${poi.name}`}
        aria-pressed={selected}
      >
        <img
          src={photo.imageUrl}
          alt={`${poi.name} (${poi.chineseName})`}
          onError={() => {
            if (photo.imageUrl !== poi.imageUrl) {
              setPhoto({ imageUrl: poi.imageUrl });
            }
          }}
        />
        <span className="category-badge">{poi.category}</span>
        <span
          className={`selection-check ${selected ? "checked" : ""}`}
          aria-hidden="true"
        >
          {selected ? "✓" : ""}
        </span>
      </button>

      <div className="poi-card-content">
        <div className="poi-title-row">
          <div>
            <h3>{poi.name}</h3>
            <span>{poi.chineseName}</span>
          </div>
          <div
            className="poi-rating"
            aria-label={`Rating ${poi.rating} out of 5`}
          >
            <span>★</span>
            {poi.rating.toFixed(1)}
          </div>
        </div>

        <p className="poi-address">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {poi.address}
        </p>
        <p className="poi-description">{poi.description}</p>

        {photo.attribution && (
          <p className="photo-attribution">
            Photo by{" "}
            {photo.attribution.uri ? (
              <a href={photo.attribution.uri} target="_blank" rel="noreferrer">
                {photo.attribution.displayName}
              </a>
            ) : (
              photo.attribution.displayName
            )}
          </p>
        )}

        <div className="poi-card-footer">
          <span>
            {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}
          </span>
          <button
            type="button"
            onClick={() => onToggle(poi.id)}
            aria-pressed={selected}
          >
            {selected ? "Selected" : "Select POI"}
          </button>
        </div>
      </div>
    </article>
  );
}
