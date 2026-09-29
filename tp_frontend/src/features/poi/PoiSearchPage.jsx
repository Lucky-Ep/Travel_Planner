import { useEffect, useMemo, useRef, useState } from "react";
import "./poi.css";
import AddToTripModal from "./AddToTripModal";
import PoiCard from "./PoiCard";
import { MOCK_DAYS, MOCK_TRIPS, SHANGHAI_POIS } from "./mockpoi";
import { addPoisToTripDay, searchPois } from "./services";

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

export default function PoiSearchPage() {
  const [draftKeyword, setDraftKeyword] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [history, setHistory] = useState(readHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [results, setResults] = useState(SHANGHAI_POIS);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pendingPoiIds, setPendingPoiIds] = useState(null);
  const [toast, setToast] = useState("");
  const searchRef = useRef(null);
  const searchRequestId = useRef(0);

  const selectedPois = useMemo(
    () => [...selectedIds].map((id) => POI_BY_ID.get(id)).filter(Boolean),
    [selectedIds],
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
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

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
      if (requestId === searchRequestId.current) setResults(data);
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

  const confirmAddToTrip = async (dayId) => {
    const poiIds = pendingPoiIds ?? [];

    if (!poiIds.length || !MOCK_DAYS.some((day) => day.id === dayId)) {
      throw new Error("Invalid trip selection");
    }

    await addPoisToTripDay({ poiIds, dayId });
    setPendingPoiIds(null);
    setSelectedIds(new Set());
    setToast(
      `${poiIds.length} ${poiIds.length === 1 ? "POI was" : "POIs were"} added to your trip.`,
    );
  };

  return (
    <div className={`page-shell ${selectedPois.length ? "has-selection" : ""}`}>
      <header>
        <a className="brand" href="/" aria-label="Travel planner search">
          <span className="brand-pin" aria-hidden="true"></span>
          <span>Travel Planner</span>
        </a>
        <span className="status-badge">Shanghai</span>
      </header>

      <main>
        <section className="intro">
          <h1>Where do you want to go?</h1>
          <p>Search landmarks, culture, food and local experiences.</p>
        </section>

        <div className="search-component" ref={searchRef}>
          <form className="search-bar" onSubmit={submitSearch}>
            <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m21 21-4.35-4.35m2.35-5.4A7.75 7.75 0 1 1 3.5 11.25a7.75 7.75 0 0 1 15.5 0Z" />
            </svg>

            <input
              value={draftKeyword}
              onChange={(event) => setDraftKeyword(event.target.value)}
              onFocus={() => setHistoryOpen(true)}
              placeholder="Search The Bund, museum, food..."
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
                  selected={selectedIds.has(poi.id)}
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
      </main>

      {selectedPois.length > 0 && (
        <aside className="selection-bar" aria-label="Selected POIs">
          <div className="selection-summary">
            <span>{selectedPois.length}</span>
            <div>
              <strong>
                {selectedPois.length === 1 ? "POI selected" : "POIs selected"}
              </strong>
              <small>{selectedPois.map((poi) => poi.name).join(" · ")}</small>
            </div>
          </div>
          <button
            className="clear-selection"
            type="button"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </button>
          <button
            className="add-trip-button"
            type="button"
            onClick={openTripModal}
          >
            Add to Trip
          </button>
        </aside>
      )}

      {pendingPoiIds && pendingPois.length > 0 && (
        <AddToTripModal
          pois={pendingPois}
          trips={MOCK_TRIPS}
          days={MOCK_DAYS}
          onClose={() => setPendingPoiIds(null)}
          onConfirm={confirmAddToTrip}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
