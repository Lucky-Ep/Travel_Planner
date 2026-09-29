import { useEffect, useState } from "react";

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

export default function AddToTripModal({
  pois,
  trips,
  days,
  onClose,
  onConfirm,
}) {
  const initialTripId = trips[0]?.id ?? "";
  const [tripId, setTripId] = useState(initialTripId);
  const [dayId, setDayId] = useState(
    () => days.find((day) => day.tripId === initialTripId)?.id ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableDays = days.filter((day) => day.tripId === tripId);

  const changeTrip = (event) => {
    const nextTripId = event.target.value;
    setTripId(nextTripId);
    setDayId(days.find((day) => day.tripId === nextTripId)?.id ?? "");
    setError("");
  };

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  const submit = async () => {
    if (!dayId || saving) return;
    setSaving(true);
    setError("");
    try {
      await onConfirm(dayId);
    } catch {
      setError("Could not add the selected POIs. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-modal-title"
    >
      <button
        className="modal-backdrop"
        type="button"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-label="Close dialog"
        disabled={saving}
      />
      <section className="trip-modal">
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close"
          disabled={saving}
        >
          ×
        </button>
        <span className="modal-label">ITINERARY</span>
        <h2 id="trip-modal-title">Add to Trip</h2>
        <p className="modal-description">
          Choose where to add {pois.length} selected{" "}
          {pois.length === 1 ? "place" : "places"}.
        </p>

        <div className="selected-poi-preview">
          {pois.slice(0, 4).map((poi) => (
            <img key={poi.id} src={poi.imageUrl} alt="" title={poi.name} />
          ))}
          {pois.length > 4 && <span>+{pois.length - 4}</span>}
          <strong>{pois.map((poi) => poi.name).join(", ")}</strong>
        </div>

        <label className="modal-field">
          <span>Trip</span>
          <select
            value={tripId}
            onChange={changeTrip}
            disabled={!trips.length || saving}
          >
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.name} · {trip.city}
              </option>
            ))}
          </select>
        </label>

        <label className="modal-field">
          <span>Day</span>
          <select
            value={dayId}
            onChange={(event) => setDayId(event.target.value)}
            disabled={!availableDays.length || saving}
          >
            {availableDays.map((day) => (
              <option key={day.id} value={day.id}>
                Day {day.dayIndex} · {formatDate(day.date)}
              </option>
            ))}
          </select>
        </label>

        {!trips.length && (
          <p className="modal-warning">Create a trip before adding a POI.</p>
        )}
        {trips.length > 0 && !availableDays.length && (
          <p className="modal-warning">This trip does not have any days yet.</p>
        )}
        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={submit}
            disabled={!dayId || saving}
          >
            {saving
              ? "Adding…"
              : `Add ${pois.length} ${pois.length === 1 ? "POI" : "POIs"}`}
          </button>
        </div>
      </section>
    </div>
  );
}
