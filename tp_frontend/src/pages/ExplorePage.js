import PoiSearchPage from '../features/poi/PoiSearchPage';
import SearchMapView from '../features/mapRouteVisual/components/SearchMapView';
import './ExplorePage.css';

export default function ExplorePage() {
  return (
    <div className="tp-explore-page">
      <PoiSearchPage
        renderMap={({
          pois,
          selectedPois,
          activePoi,
          onActivatePoi,
        }) => (
          <section className="tp-explore-map" aria-label="Shanghai POI map">
            <div className="tp-explore-map-status">
              <strong>{activePoi ? activePoi.name : 'Explore Shanghai'}</strong>
              <span>
                {activePoi
                  ? `${activePoi.chineseName} · ${activePoi.category}`
                  : `${pois.length} place${pois.length === 1 ? '' : 's'} in view`}
              </span>
            </div>
            <SearchMapView
              pois={activePoi ? [activePoi] : pois}
              activePoiId={activePoi?.id ?? null}
              selectedPoiIds={selectedPois.map((poi) => poi.id)}
              onPoiActivate={onActivatePoi}
            />
          </section>
        )}
      />
    </div>
  );
}
