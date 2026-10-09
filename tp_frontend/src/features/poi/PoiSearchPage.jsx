import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./poi.css";
import AddToTripModal from "./AddToTripModal";
import PoiCard from "./PoiCard";
import { SHANGHAI_POIS } from "./mockpoi";
import {
  addPoisToTripDay,
  getTripAndDayOptions,
  searchPois,
} from "./services";

const STORAGE_KEY = "poi-search-history";
const MAX_HISTORY_ITEMS = 6;
const POI_BY_ID = new Map(SHANGHAI_POIS.map((poi) => [poi.id, poi]));

function readHistory() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function PoiSearchPage({ renderMap }) {
  const [draftKeyword, setDraftKeyword] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [history, setHistory] = useState(readHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [results, setResults] = useState(SHANGHAI_POIS);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activePoiId, setActivePoiId] = useState(null);
  const [pendingPoiIds, setPendingPoiIds] = useState(null);
  const [toast, setToast] = useState("");
  const [lastAddedTripId, setLastAddedTripId] = useState(null);
  const [tripOptions, setTripOptions] = useState({ trips: [], days: [] });
  const searchRef = useRef(null);
  const panelScrollRef = useRef(null);
  const searchRequestId = useRef(0);

  const selectedPois = useMemo(
    () => [...selectedIds].map((id) => POI_BY_ID.get(id)).filter(Boolean),
    [selectedIds],
  );

  const activePoi = useMemo(
    () =>
      results.find((poi) => poi.id === activePoiId) ??
      POI_BY_ID.get(activePoiId) ??
      null,
    [activePoiId, results],
  );

  const pendingPois = useMemo(
    () => (pendingPoiIds ?? []).map((id) => POI_BY_ID.get(id)).filter(Boolean),
    [pendingPoiIds],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Search still works when browser storage is unavailable.
    }
  }, [history]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setHistoryOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => {
      setToast("");
      setLastAddedTripId(null);
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let active = true;
    void getTripAndDayOptions()
      .then((options) => {
        if (active) setTripOptions(options);
      })
      .catch(() => {
        // Users can still type a new Trip and Day when options are unavailable.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (panelScrollRef.current) panelScrollRef.current.scrollTop = 0;
  }, [activePoiId]);

  const runSearch = async (value) => {
    const cleanValue = value.trim();
    const requestId = ++searchRequestId.current;

    setDraftKeyword(cleanValue);
    setCommittedQuery(cleanValue);
    setHistoryOpen(false);
    setLoading(true);
    setSearchError("");

    if (cleanValue) {
      setHistory((current) =>
        [cleanValue, ...current.filter((item) => item !== cleanValue)].slice(
          0,
          MAX_HISTORY_ITEMS,
        ),
      );
    }

    try {
      const data = await searchPois(cleanValue);
      if (requestId === searchRequestId.current) {
        setResults(data);
        setActivePoiId((currentId) =>
          data.some((poi) => poi.id === currentId) ? currentId : null,
        );
      }
    } catch {
      if (requestId === searchRequestId.current) {
        setSearchError("The search could not be completed. Please try again.");
      }
    } finally {
      if (requestId === searchRequestId.current) setLoading(false);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    void runSearch(draftKeyword);
  };

  const removeHistoryItem = (event, item) => {
    event.stopPropagation();
    setHistory((current) =>
      current.filter((historyItem) => historyItem !== item),
    );
  };

  const togglePoi = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openTripModal = () => {
    if (selectedIds.size) setPendingPoiIds([...selectedIds]);
  };

  const confirmAddToTrip = async (destination) => {
    const poiIds = pendingPoiIds ?? [];

    if (!poiIds.length || !destination?.tripId || !destination?.dayId) {
      throw new Error("Invalid trip selection");
    }

    const saved = await addPoisToTripDay({ poiIds, ...destination });
    setPendingPoiIds(null);
    setSelectedIds(new Set());
    setLastAddedTripId(saved.trip.id);
    setTripOptions((current) => ({
      trips: current.trips.some(
        (trip) => String(trip.id) === String(saved.trip.id),
      )
        ? current.trips
        : [...current.trips, saved.trip],
      days: current.days.some(
        (day) => String(day.id) === String(saved.day.id),
      )
        ? current.days
        : [...current.days, saved.day],
    }));
    setToast(
      `${poiIds.length} ${poiIds.length === 1 ? "POI was" : "POIs were"} added to ${destination.tripName} / ${destination.dayName}.`,
    );
  };

  return (
    <div className="page-shell">
      <div className="poi-map-layout">
        <section className="poi-control-panel" aria-label="POI search panel">
          <header className="poi-panel-search">
            <div className="search-component" ref={searchRef}>
              <form className="search-bar" onSubmit={submitSearch}>
                <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m21 21-4.35-4.35m2.35-5.4A7.75 7.75 0 1 1 3.5 11.25a7.75 7.75 0 0 1 15.5 0Z" />
                </svg>

                <input
                  value={draftKeyword}
                  onChange={(event) => setDraftKeyword(event.target.value)}
                  onFocus={() => setHistoryOpen(true)}
                  placeholder="Search Shanghai places..."
                  aria-label="Search POIs"
                  aria-controls="search-history-panel"
                  autoComplete="off"
                />

                {draftKeyword && (
                  <button
                    className="clear-input"
                    type="button"
                    onClick={() => setDraftKeyword("")}
                    aria-label="Clear input"
                  >
                    ×
                  </button>
                )}

                <button className="search-button" type="submit">
                  Search
                </button>
              </form>

              {historyOpen && (
                <section
                  className="history-panel"
                  id="search-history-panel"
                  aria-label="Search history"
                >
                  <div className="history-heading">
                    <strong>Recent searches</strong>
                    {history.length > 0 && (
                      <button type="button" onClick={() => setHistory([])}>
                        Clear history
                      </button>
                    )}
                  </div>

                  {history.length > 0 ? (
                    <ul>
                      {history.map((item) => (
                        <li key={item}>
                          <button
                            className="history-query"
                            type="button"
                            onClick={() => void runSearch(item)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span>{item}</span>
                          </button>
                          <button
                            className="remove-history"
                            type="button"
                            onClick={(event) => removeHistoryItem(event, item)}
                            aria-label={`Delete ${item}`}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="empty-history">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span>No search history yet</span>
                    </div>
                  )}

                  <div className="search-suggestions">
                    <span>Try</span>
                    {["The Bund", "museum", "food"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => void runSearch(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </header>

          <section
            className="selected-poi-panel"
            aria-labelledby="selected-pois-title"
          >
            <div className="selected-poi-panel-heading">
              <div>
                <span>YOUR SELECTION</span>
                <h2 id="selected-pois-title">Selected POIs</h2>
              </div>
              <strong>{selectedPois.length}</strong>
            </div>

            {selectedPois.length ? (
              <ul className="selected-poi-list">
                {selectedPois.map((poi) => (
                  <li key={poi.id}>
                    <button
                      className="selected-poi-name"
                      type="button"
                      onClick={() => setActivePoiId(poi.id)}
                      aria-label={`Show ${poi.name} details`}
                    >
                      <span>{poi.name}</span>
                      <small>{poi.chineseName}</small>
                    </button>
                    <button
                      className="remove-selected-poi"
                      type="button"
                      onClick={() => togglePoi(poi.id)}
                      aria-label={`Remove ${poi.name} from selection`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="selected-poi-empty">
                Select places below to build your trip list.
              </p>
            )}

            {selectedPois.length > 0 && (
              <div className="selected-poi-actions">
                <button
                  className="clear-selection"
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear all
                </button>
                <button
                  className="add-trip-button"
                  type="button"
                  onClick={openTripModal}
                >
                  Add {selectedPois.length} to Trip
                </button>
              </div>
            )}
          </section>

          <div className="poi-panel-scroll" ref={panelScrollRef}>
            {activePoi ? (
              <section className="poi-detail-view" aria-labelledby="poi-detail-title">
                <div className="poi-detail-hero">
                  <img
                    src={activePoi.imageUrl}
                    alt={`${activePoi.name} (${activePoi.chineseName})`}
                  />
                  <button
                    className="poi-detail-back"
                    type="button"
                    onClick={() => setActivePoiId(null)}
                  >
                    ← Results
                  </button>
                </div>

                <div className="poi-detail-content">
                  <span className="poi-detail-category">{activePoi.category}</span>
                  <h1 id="poi-detail-title">{activePoi.name}</h1>
                  <p className="poi-detail-chinese">{activePoi.chineseName}</p>
                  <div className="poi-detail-rating">
                    <strong>{activePoi.rating.toFixed(1)}</strong>
                    <span aria-label={`${activePoi.rating} out of 5 stars`}>★★★★★</span>
                  </div>

                  <button
                    className="poi-detail-select"
                    type="button"
                    aria-pressed={selectedIds.has(activePoi.id)}
                    onClick={() => togglePoi(activePoi.id)}
                  >
                    {selectedIds.has(activePoi.id) ? "✓ Selected" : "+ Select POI"}
                  </button>

                  <div className="poi-detail-section">
                    <strong>About</strong>
                    <p>{activePoi.description}</p>
                  </div>
                  <div className="poi-detail-section poi-detail-facts">
                    <p><span>⌖</span>{activePoi.address}</p>
                    <p>
                      <span>◎</span>
                      {activePoi.latitude.toFixed(4)}, {activePoi.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="poi-detail-tags">
                    {activePoi.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </div>
              </section>
            ) : (
              <section className="results-section">
            <div className="results-heading">
              <div>
                <h2>
                  {committedQuery
                    ? `Results for “${committedQuery}”`
                    : "Places to explore"}
                </h2>
                <p role="status">
                  {loading
                    ? "Searching…"
                    : searchError
                      ? "Search failed"
                      : `${results.length} ${results.length === 1 ? "place" : "places"} found`}
                </p>
              </div>
              {selectedPois.length > 0 && (
                <span className="selected-count">
                  {selectedPois.length} selected
                </span>
              )}
            </div>

            {loading ? (
              <div className="result-state">
                <span className="loader" />
                <strong>Searching Shanghai…</strong>
              </div>
            ) : searchError ? (
              <div className="result-state error-state" role="alert">
                <strong>{searchError}</strong>
                <button
                  type="button"
                  onClick={() => void runSearch(committedQuery)}
                >
                  Try again
                </button>
              </div>
            ) : results.length ? (
              <div className="poi-grid">
                {results.map((poi) => (
                  <PoiCard
                    key={poi.id}
                    poi={poi}
                    active={activePoiId === poi.id}
                    selected={selectedIds.has(poi.id)}
                    onOpen={setActivePoiId}
                    onToggle={togglePoi}
                  />
                ))}
              </div>
            ) : (
              <div className="result-state empty-state-results">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m21 21-4.35-4.35m2.35-5.4A7.75 7.75 0 1 1 3.5 11.25a7.75 7.75 0 0 1 15.5 0Z" />
                </svg>
                <strong>No matching POIs</strong>
                <p>
                  Try a place name, category or district such as “museum” or
                  “Huangpu”.
                </p>
                <button type="button" onClick={() => void runSearch("")}>
                  Show all places
                </button>
              </div>
            )}
              </section>
            )}
          </div>
        </section>

        {renderMap ? (
          <aside className="poi-map-slot" aria-label="POI map">
            {renderMap({
              pois: results,
              selectedPois,
              activePoi,
              onActivatePoi: setActivePoiId,
            })}
          </aside>
        ) : null}
      </div>

      {pendingPoiIds && pendingPois.length > 0 && (
        <AddToTripModal
          pois={pendingPois}
          trips={tripOptions.trips}
          days={tripOptions.days}
          onClose={() => setPendingPoiIds(null)}
          onConfirm={confirmAddToTrip}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          <p>{toast}</p>
          {lastAddedTripId && (
            <Link to={`/trips/${encodeURIComponent(lastAddedTripId)}`}>
              View in My Trips
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
