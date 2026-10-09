import { useEffect, useState } from "react";

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function formatTrip(trip) {
  return `${trip.name} · ${trip.city}`;
}

function formatDay(day) {
  return day.name || `Day ${day.dayIndex} · ${formatDate(day.date)}`;
}

function slugify(value) {
  return (
    value
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "custom"
  );
}

export default function AddToTripModal({
  pois,
  trips,
  days,
  onClose,
  onConfirm,
}) {
  const initialTrip =
    trips.find((trip) => trip.city?.toLowerCase() === "shanghai") ??
    trips[0] ??
    null;
  const initialDay = initialTrip
    ? days.find((day) => day.tripId === initialTrip.id)
    : null;
  const [tripValue, setTripValue] = useState(
    initialTrip ? formatTrip(initialTrip) : "",
  );
  const [dayValue, setDayValue] = useState(
    initialDay ? formatDay(initialDay) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const matchedTrip = trips.find(
    (trip) => formatTrip(trip) === tripValue.trim(),
  );
  const availableDays = matchedTrip
    ? days.filter((day) => day.tripId === matchedTrip.id)
    : days;

  const changeTrip = (event) => {
    const nextValue = event.target.value;
    const nextTrip = trips.find((trip) => formatTrip(trip) === nextValue.trim());

    setTripValue(nextValue);
    if (nextTrip) {
      const firstDay = days.find((day) => day.tripId === nextTrip.id);
      setDayValue(firstDay ? formatDay(firstDay) : "");
    }
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
    const cleanTrip = tripValue.trim();
    const cleanDay = dayValue.trim();
    if (saving) return;
    if (!cleanTrip || !cleanDay) {
      setError("Enter both a Trip and a Day.");
      return;
    }

    const selectedTrip = trips.find(
      (trip) => formatTrip(trip) === cleanTrip,
    );
    const selectedDay = days.find(
      (day) =>
        (!selectedTrip || day.tripId === selectedTrip.id) &&
        formatDay(day) === cleanDay,
    );
    const resolvedTripId =
      selectedTrip?.id ?? `custom-trip-${slugify(cleanTrip)}`;
    const resolvedDayId =
      selectedDay?.id ?? `${resolvedTripId}-day-${slugify(cleanDay)}`;

    setSaving(true);
    setError("");
    try {
      await onConfirm({
        tripId: resolvedTripId,
        dayId: resolvedDayId,
        tripName: cleanTrip,
        dayName: cleanDay,
        isCustomTrip: !selectedTrip,
        isCustomDay: !selectedDay,
      });
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
          <input
            list="trip-options"
            aria-label="Trip"
            value={tripValue}
            onChange={changeTrip}
            placeholder="Choose or enter a Trip"
            disabled={saving}
          />
          <datalist id="trip-options">
            {trips.map((trip) => (
              <option key={trip.id} value={formatTrip(trip)} />
            ))}
          </datalist>
          <small>Choose an existing Trip or type a new one.</small>
        </label>

        <label className="modal-field">
          <span>Day</span>
          <input
            list="day-options"
            aria-label="Day"
            value={dayValue}
            onChange={(event) => {
              setDayValue(event.target.value);
              setError("");
            }}
            placeholder="Choose or enter a Day"
            disabled={saving}
          />
          <datalist id="day-options">
            {availableDays.map((day) => (
              <option key={day.id} value={formatDay(day)} />
            ))}
          </datalist>
          <small>For example: Day 3 · 20 Oct or Free afternoon.</small>
        </label>

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
            disabled={saving}
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
