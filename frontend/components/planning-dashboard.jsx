"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchLocations,
  regenerateRecommendations,
  seedLocations,
  uploadLocationsCsv
} from "../lib/api.js";
import { formatNumber, formatPercent } from "../lib/format.js";
import { MapView } from "./map-view.jsx";

const LOCATION_PAGE_SIZE = 10;

export function PlanningDashboard({ accessToken = "", currentUserEmail = "", onSignOut }) {
  const [locations, setLocations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const uploadInputRef = useRef(null);

  const selectedLocation = useMemo(() => {
    return locations.find((location) => location.id === selectedId) || locations[0];
  }, [locations, selectedId]);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const payload = await fetchLocations(accessToken);
      setLocations(payload.locations || []);
      setSelectedId((current) => current || payload.locations?.[0]?.id || "");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  async function handleSeed() {
    await runAction(async () => {
      const payload = await seedLocations(accessToken);
      setLocations(payload.locations || []);
      setSelectedId(payload.locations?.[0]?.id || "");
      setMessage("Demo locations scored and saved without removing uploaded locations.");
    });
  }

  async function handleUpload(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    await runAction(async () => {
      const csv = await file.text();
      const payload = await uploadLocationsCsv(csv, accessToken);
      setLocations(payload.locations || []);
      setSelectedId(payload.locations?.[0]?.id || "");
      setMessage("Uploaded locations scored and saved.");
    });

    event.target.value = "";
  }

  async function handleRegenerate() {
    await runAction(async () => {
      const payload = await regenerateRecommendations(accessToken);
      setLocations(payload.locations || []);
      setMessage("Recommendation summaries refreshed.");
    });
  }

  async function runAction(action) {
    setIsLoading(true);
    setMessage("");

    try {
      await action();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <p className="brand-line">Walker-Miller Energy Services</p>
          <h1>Electrification & EV Planning Agent</h1>
          {currentUserEmail ? <p className="app-user">Signed in as {currentUserEmail}</p> : null}
        </div>

        <div className="app-actions" aria-label="Planning actions">
          <button className="button-primary" type="button" onClick={handleSeed} disabled={isLoading}>
            Add demo locations
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={isLoading}
          >
            Upload CSV
          </button>
          <input
            ref={uploadInputRef}
            className="visually-hidden"
            type="file"
            accept=".csv"
            onChange={handleUpload}
            disabled={isLoading}
          />
          <button className="button-secondary" type="button" onClick={handleRegenerate} disabled={isLoading}>
            Refresh summaries
          </button>
          {onSignOut ? (
            <button className="button-secondary" type="button" onClick={onSignOut}>
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      <div className="app-content">
        {message ? <div className="notice notice-warning">{message}</div> : null}

        <section className="summary-strip" aria-label="Planning summary">
          <SummaryItem label="Locations" value={locations.length} />
          <SummaryItem label="Average score" value={formatNumber(average(locations.map((location) => location.score)))} />
          <SummaryItem label="High priority" value={locations.filter((location) => location.priority === "High").length} />
          <SummaryItem label="Average ROI" value={formatPercent(average(locations.map((location) => location.roi_estimate)))} />
        </section>

        <section className="workspace-grid">
          <section className="map-panel" aria-labelledby="map-title">
            <div className="section-header">
              <div>
                <h2 id="map-title">Scored location map</h2>
                <p>{locations.length ? `${locations.length} candidate locations` : "No locations loaded"}</p>
              </div>
              <span className="status-text">{isLoading ? "Loading" : "Ready"}</span>
            </div>
            <MapView locations={locations} selectedId={selectedLocation?.id} onSelect={setSelectedId} />
          </section>

          <aside className="detail-panel" aria-label="Selected location details">
            {selectedLocation ? <LocationDetail location={selectedLocation} /> : <EmptyState />}
          </aside>
        </section>

        <section className="content-grid">
          <LocationTable locations={locations} selectedId={selectedLocation?.id} onSelect={setSelectedId} />
          <Recommendations locations={locations} />
        </section>
      </div>
    </main>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LocationDetail({ location }) {
  return (
    <section className="location-detail">
      <p className="context-label">Selected location</p>
      <h2>{location.name}</h2>
      <dl className="detail-grid">
        <Detail label="Score" value={formatNumber(location.score)} />
        <Detail label="Priority" value={location.priority} />
        <Detail label="ROI" value={formatPercent(location.roi_estimate)} />
        <Detail label="Grid" value={formatPercent(location.grid_readiness)} />
        <Detail label="Demand" value={formatNumber(location.energy_demand)} />
        <Detail label="Traffic" value={formatNumber(location.traffic_score)} />
      </dl>
      <p className="detail-summary">{location.recommendation_summary}</p>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-cell">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function LocationTable({ locations, selectedId, onSelect }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(locations.length / LOCATION_PAGE_SIZE));
  const startIndex = (currentPage - 1) * LOCATION_PAGE_SIZE;
  const visibleLocations = locations.slice(startIndex, startIndex + LOCATION_PAGE_SIZE);
  const showingStart = locations.length ? startIndex + 1 : 0;
  const showingEnd = startIndex + visibleLocations.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [locations.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <section className="data-panel" aria-labelledby="locations-title">
      <div className="section-header">
        <div>
          <h2 id="locations-title">Candidate locations</h2>
          <p>Ranked by score, ROI, and readiness.</p>
        </div>
        {locations.length ? <span className="status-text">10 per page</span> : null}
      </div>

      {locations.length ? (
        <>
          <div className="table-scroll">
            <table className="locations-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Location</th>
                  <th>Score</th>
                  <th>Priority</th>
                  <th>ROI</th>
                  <th>Grid</th>
                </tr>
              </thead>
              <tbody>
                {visibleLocations.map((location, index) => (
                  <tr key={location.id} className={location.id === selectedId ? "is-selected" : ""}>
                    <td>{startIndex + index + 1}</td>
                    <td>
                      <button className="location-link" type="button" onClick={() => onSelect(location.id)}>
                        {location.name}
                      </button>
                    </td>
                    <td>{formatNumber(location.score)}</td>
                    <td>{location.priority}</td>
                    <td>{formatPercent(location.roi_estimate)}</td>
                    <td>{formatPercent(location.grid_readiness)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>
              Showing {showingStart}-{showingEnd} of {locations.length}
            </span>
            {totalPages > 1 ? (
              <div className="pagination-actions" aria-label="Candidate locations pagination">
                <button
                  className="pagination-button"
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="pagination-button"
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="empty-state compact">
          <p>Seed demo locations or upload a CSV to populate the planning table.</p>
        </div>
      )}
    </section>
  );
}

function Recommendations({ locations }) {
  const topLocations = locations.slice(0, 4);

  return (
    <section className="data-panel" aria-labelledby="recommendations-title">
      <div className="section-header">
        <div>
          <h2 id="recommendations-title">Recommendations</h2>
          <p>Current planning notes for the highest ranked sites.</p>
        </div>
      </div>

      {topLocations.length ? (
        <div className="recommendation-list">
          {topLocations.map((location) => (
            <article key={location.id} className="recommendation-item">
              <h3>{location.name}</h3>
              <p>{location.recommendation_summary}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <p>Recommendations will appear after locations are scored.</p>
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <h2>No locations loaded</h2>
      <p>Seed demo locations or upload location data to start planning.</p>
    </div>
  );
}

function average(values) {
  const validValues = values.map(Number).filter(Number.isFinite);
  if (!validValues.length) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unable to complete the request.";
}
