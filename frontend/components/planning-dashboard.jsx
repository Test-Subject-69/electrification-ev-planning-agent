"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  askLocationQuestion,
  compareLocations,
  fetchLocations,
  regenerateRecommendations,
  seedLocations,
  uploadLocationsCsv
} from "../lib/api.js";
import { formatNumber, formatPercent } from "../lib/format.js";
import { BrandLogo } from "./brand-logo.jsx";
import { MapView } from "./map-view.jsx";

const LOCATION_PAGE_SIZE = 10;

export function PlanningDashboard({ accessToken = "", currentUserEmail = "", onSignOut }) {
  const [locations, setLocations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [compareIds, setCompareIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGrayMap, setIsGrayMap] = useState(false);
  const [message, setMessage] = useState("");
  const [mapAskLocationId, setMapAskLocationId] = useState("");
  const uploadInputRef = useRef(null);
  const chatSectionRef = useRef(null);

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

  useEffect(() => {
    setCompareIds((current) => {
      const validIds = current.filter((locationId) => locations.some((location) => location.id === locationId));
      return validIds.length === current.length ? current : validIds;
    });
  }, [locations]);

  useEffect(() => {
    let isActive = true;

    async function loadComparison() {
      if (compareIds.length < 2) {
        setComparison(null);
        setCompareError("");
        setIsComparing(false);
        return;
      }

      setIsComparing(true);
      setCompareError("");

      try {
        const payload = await compareLocations(compareIds, accessToken);
        if (isActive) {
          setComparison(payload);
        }
      } catch (error) {
        if (isActive) {
          setComparison(null);
          setCompareError(getErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsComparing(false);
        }
      }
    }

    loadComparison();

    return () => {
      isActive = false;
    };
  }, [accessToken, compareIds]);

  async function handleSeed() {
    await runAction(async () => {
      const payload = await seedLocations(accessToken);
      setLocations(payload.locations || []);
      setSelectedId(payload.locations?.[0]?.id || "");
      setMapAskLocationId("");
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
      setMapAskLocationId("");
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

  function handleCompareToggle(locationId) {
    if (!compareIds.includes(locationId) && compareIds.length >= 5) {
      setMessage("Compare up to 5 locations at a time.");
      return;
    }

    setCompareIds((current) => {
      if (current.includes(locationId)) {
        return current.filter((id) => id !== locationId);
      }

      return [...current, locationId];
    });
  }

  function handleMapSelect(locationId) {
    setSelectedId(locationId);
    setMapAskLocationId(locationId);
  }

  function handleTableSelect(locationId) {
    setSelectedId(locationId);
    setMapAskLocationId("");
  }

  function handleAskForMore() {
    chatSectionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start"
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
          <BrandLogo />
          <div className="app-product-name">
            <h1>Electrification & EV Planning Agent</h1>
            {currentUserEmail ? <p className="app-user">Signed in as {currentUserEmail}</p> : null}
          </div>
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

        <div className="quadrant-grid">
          <section className="quadrant-tl map-panel" aria-labelledby="map-title">
            <div className="section-header">
              <div>
                <h2 id="map-title">Scored location map</h2>
                <p>{locations.length ? `${locations.length} candidate locations` : "No locations loaded"}</p>
              </div>
              <div className="map-header-actions">
                <button
                  className="map-mode-switch"
                  type="button"
                  role="switch"
                  aria-checked={isGrayMap}
                  aria-label="Toggle gray map"
                  onClick={() => setIsGrayMap((current) => !current)}
                >
                  <span className="map-mode-copy">Gray map</span>
                  <span className="map-mode-track" aria-hidden="true">
                    <span className="map-mode-thumb" />
                  </span>
                  <span className="map-mode-state">{isGrayMap ? "On" : "Off"}</span>
                </button>
                {isLoading && <span className="status-text">Loading</span>}
              </div>
            </div>
            <MapView
              locations={locations}
              selectedId={selectedLocation?.id}
              onSelect={handleMapSelect}
              isGrayMap={isGrayMap}
            />
            {selectedLocation && mapAskLocationId === selectedLocation.id ? (
              <button className="map-ask-button" type="button" onClick={handleAskForMore}>
                Ask for more
              </button>
            ) : null}
          </section>

          <aside className="quadrant-tr detail-panel" aria-label="Selected location details">
            {selectedLocation ? (
              <LocationDetail location={selectedLocation} accessToken={accessToken} />
            ) : (
              <EmptyState />
            )}
          </aside>

          <div className="quadrant-bl">
            <LocationTable
              locations={locations}
              selectedId={selectedLocation?.id}
              compareIds={compareIds}
              onSelect={handleTableSelect}
              onCompareToggle={handleCompareToggle}
            />
            <ComparisonPanel
              comparison={comparison}
              compareIds={compareIds}
              locations={locations}
              isLoading={isComparing}
              error={compareError}
              onClear={() => setCompareIds([])}
            />
          </div>

          <div className="quadrant-br">
            <Recommendations locations={locations} />
          </div>
        </div>

        {selectedLocation ? (
          <section ref={chatSectionRef} className="chat-section" aria-label="EV planning assistant">
            <LocationChatPanel location={selectedLocation} accessToken={accessToken} />
          </section>
        ) : null}
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

function LocationDetail({ location, accessToken }) {
  return (
    <section className="location-detail">
      <div>
        <p className="context-label">Selected location</p>
        <h2>{location.name}</h2>
      </div>
      <dl className="detail-grid">
        <Detail label="Score" value={formatNumber(location.score)} />
        <Detail label="Priority" value={<PriorityBadge priority={location.priority} />} />
        <Detail label="ROI" value={formatPercent(location.roi_estimate)} />
        <Detail label="Grid" value={formatPercent(location.grid_readiness)} />
        <Detail label="Demand" value={formatNumber(location.energy_demand)} />
        <Detail label="Traffic" value={formatNumber(location.traffic_score)} />
      </dl>
      <p className="detail-summary">{location.recommendation_summary}</p>
      <ScoreBreakdown breakdown={location.analysis?.score_breakdown || []} />
      <RiskFlagList risks={location.analysis?.risk_flags || []} />
      <NextStepList steps={location.analysis?.next_steps || []} />
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

function ScoreBreakdown({ breakdown }) {
  if (!breakdown.length) {
    return null;
  }

  return (
    <section className="analysis-section" aria-label="Score breakdown">
      <h3>Score breakdown</h3>
      <div className="score-breakdown">
        {breakdown.map((factor) => (
          <div className="score-breakdown-row" key={factor.key}>
            <span>{factor.label}</span>
            <strong>{formatNumber(factor.contribution)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskFlagList({ risks }) {
  return (
    <section className="analysis-section" aria-label="Risk flags">
      <h3>Risk flags</h3>
      {risks.length ? (
        <ul className="plain-list">
          {risks.map((risk) => (
            <li key={risk.key}>
              <strong>{risk.severity}</strong>
              <span>{risk.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="analysis-empty">No major scoring risks are currently flagged.</p>
      )}
    </section>
  );
}

function NextStepList({ steps }) {
  if (!steps.length) {
    return null;
  }

  return (
    <section className="analysis-section" aria-label="Recommended next steps">
      <h3>Next steps</h3>
      <ol className="numbered-list">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}

const QUICK_CHAT_PROMPTS = [
  "Why is this area good?",
  "What are the risks?",
  "What should we do next?"
];

function LocationChatPanel({ location, accessToken }) {
  const [messagesByLocationId, setMessagesByLocationId] = useState({});
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState("");
  const messages = messagesByLocationId[location.id] || [];

  useEffect(() => {
    setQuestion("");
    setError("");
  }, [location.id]);

  async function handleAsk(nextQuestion) {
    const text = String(nextQuestion || question).trim();
    if (!text || isAsking) {
      return;
    }

    const locationId = location.id;
    appendChatMessage(locationId, {
      id: createChatMessageId("user"),
      role: "user",
      text
    });
    setQuestion("");
    setError("");
    setIsAsking(true);

    try {
      const payload = await askLocationQuestion(location, text, accessToken);
      appendChatMessage(locationId, {
        id: createChatMessageId("assistant"),
        role: "assistant",
        text: payload.answer || "No explanation was returned.",
        sources: payload.sources || [],
        recommendedFollowUp: payload.recommended_follow_up || ""
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsAsking(false);
    }
  }

  function appendChatMessage(locationId, message) {
    setMessagesByLocationId((current) => ({
      ...current,
      [locationId]: [...(current[locationId] || []), message]
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleAsk(question);
  }

  return (
    <section className="location-chat" aria-labelledby="location-chat-title">
      <div className="chat-header-bar">
        <div className="chat-heading">
          <h3 id="location-chat-title">EV planning assistant</h3>
        </div>

        <div className="chat-quick-actions" aria-label="Quick EV planning questions">
          {QUICK_CHAT_PROMPTS.map((prompt) => (
            <button
              className="chat-chip"
              type="button"
              key={prompt}
              onClick={() => handleAsk(prompt)}
              disabled={isAsking}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-messages" aria-live="polite">
        {messages.length ? (
          messages.map((message) => (
            <article key={message.id} className={`chat-message ${message.role}`}>
              <p>{message.text}</p>
              {message.sources?.length ? (
                <span>Sources: {message.sources.join(", ")}</span>
              ) : null}
              {message.recommendedFollowUp ? (
                <button
                  className="chat-follow-up"
                  type="button"
                  onClick={() => handleAsk(message.recommendedFollowUp)}
                  disabled={isAsking}
                >
                  Suggested: {message.recommendedFollowUp}
                </button>
              ) : null}
            </article>
          ))
        ) : (
          <div className="chat-empty">
            <p>Start with a quick question to get an executive-ready explanation for this area.</p>
          </div>
        )}
        {isAsking ? (
          <div className="chat-message assistant">
            <p>Reviewing location metrics and portfolio context...</p>
          </div>
        ) : null}
      </div>

      {error ? <div className="notice notice-warning">{error}</div> : null}

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          className="text-input"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about this location"
          disabled={isAsking}
        />
        <button className="button-primary" type="submit" disabled={isAsking || !question.trim()}>
          Ask question
        </button>
      </form>
    </section>
  );
}

function ComparisonPanel({ comparison, compareIds, locations, isLoading, error, onClear }) {
  if (!compareIds.length) {
    return null;
  }

  const selectedNames = compareIds
    .map((locationId) => locations.find((location) => location.id === locationId)?.name)
    .filter(Boolean);

  return (
    <section className="data-panel comparison-panel" aria-labelledby="comparison-title">
      <div className="section-header">
        <div>
          <h2 id="comparison-title">Location comparison</h2>
          <p>{selectedNames.length ? selectedNames.join(", ") : "Select locations to compare."}</p>
        </div>
        <button className="button-secondary" type="button" onClick={onClear}>
          Clear comparison
        </button>
      </div>

      {compareIds.length < 2 ? (
        <div className="empty-state compact">
          <p>Select one more location to compare planning strengths, risks, and next steps.</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="empty-state compact">
          <p>Comparing selected locations...</p>
        </div>
      ) : null}

      {error ? <div className="notice notice-warning comparison-notice">{error}</div> : null}

      {!isLoading && comparison?.selected_locations?.length ? (
        <div className="comparison-content">
          <div className="comparison-summary">
            <strong>Recommended option: {comparison.recommended_winner.location_name}</strong>
            <p>{comparison.summary}</p>
          </div>

          <div className="table-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Score</th>
                  <th>ROI</th>
                  <th>Grid</th>
                  <th>Demand</th>
                  <th>Traffic</th>
                  <th>Risks</th>
                </tr>
              </thead>
              <tbody>
                {comparison.selected_locations.map((location) => (
                  <tr key={location.id}>
                    <td>{location.name}</td>
                    <td>{formatNumber(location.score)}</td>
                    <td>{formatPercent(location.roi_estimate)}</td>
                    <td>{formatPercent(location.grid_readiness)}</td>
                    <td>{formatNumber(location.energy_demand)}</td>
                    <td>{formatNumber(location.traffic_score)}</td>
                    <td>{location.risk_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="best-metrics" aria-label="Best location by metric">
            {Object.values(comparison.best_by_metric || {}).map((metric) => (
              <div className="best-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.location_name}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LocationTable({ locations, selectedId, compareIds, onSelect, onCompareToggle }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(locations.length / LOCATION_PAGE_SIZE));
  const startIndex = (currentPage - 1) * LOCATION_PAGE_SIZE;
  const visibleLocations = locations.slice(startIndex, startIndex + LOCATION_PAGE_SIZE);
  const placeholderRows = Math.max(0, LOCATION_PAGE_SIZE - visibleLocations.length);
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
        {locations.length ? <span className="status-text">10 per page - {compareIds.length}/5 comparing</span> : null}
      </div>

      {locations.length ? (
        <>
          <div className="table-scroll">
            <table className="locations-table">
              <thead>
                <tr>
                  <th>Compare</th>
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
                    <td>
                      <input
                        className="compare-checkbox"
                        type="checkbox"
                        checked={compareIds.includes(location.id)}
                        onChange={() => onCompareToggle(location.id)}
                        aria-label={`Compare ${location.name}`}
                        disabled={!compareIds.includes(location.id) && compareIds.length >= 5}
                      />
                    </td>
                    <td>{startIndex + index + 1}</td>
                    <td>
                      <button className="location-link" type="button" onClick={() => onSelect(location.id)}>
                        {location.name}
                      </button>
                    </td>
                    <td>{formatNumber(location.score)}</td>
                    <td><PriorityBadge priority={location.priority} /></td>
                    <td>{formatPercent(location.roi_estimate)}</td>
                    <td>{formatPercent(location.grid_readiness)}</td>
                  </tr>
                ))}
                {Array.from({ length: placeholderRows }).map((_, index) => (
                  <tr key={`placeholder-${index}`} className="is-placeholder" aria-hidden="true">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
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
              <p>{location.analysis?.recommendation_brief || location.recommendation_summary}</p>
              <div className="recommendation-details">
                <span className="rec-strength">Strength: {location.analysis?.strengths?.[0]?.message || "Balanced planning profile"}</span>
                <span className="rec-risk">Risk: {location.analysis?.risk_flags?.[0]?.message || "No major scoring risk flagged"}</span>
                <span className="rec-next">Next: {location.analysis?.next_steps?.[0] || "Confirm site feasibility before committing capital."}</span>
              </div>
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

function PriorityBadge({ priority }) {
  const level = (priority || "Watch").toLowerCase();
  return <span className={`priority-badge ${level}`}>{priority || "Watch"}</span>;
}

function EmptyState() {
  return (
    <div className="empty-state">
      <h2>No locations loaded</h2>
      <p>Seed demo locations or upload location data to start planning.</p>
    </div>
  );
}

function createChatMessageId(role) {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
