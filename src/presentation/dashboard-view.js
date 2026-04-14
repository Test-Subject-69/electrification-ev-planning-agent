const priorityClasses = {
  High: "priority-high",
  Medium: "priority-medium",
  Watch: "priority-watch"
};

export function createDashboard(root, handlers) {
  let selectedSiteId = null;
  let activeScenario = "balanced";

  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Walker-Miller Energy Services</p>
          <h1>Electrification & EV Planning Agent</h1>
        </div>
        <div class="topbar-actions">
          <label class="upload-button">
            <span>Upload Sites</span>
            <input id="site-upload" type="file" accept=".csv,.json">
          </label>
          <select id="scenario-select" aria-label="Planning scenario">
            <option value="balanced">Balanced</option>
            <option value="equity">Equity First</option>
            <option value="roi">ROI First</option>
            <option value="gridReady">Grid Ready</option>
          </select>
        </div>
      </header>

      <main class="dashboard">
        <section class="metric-grid" id="metric-grid" aria-label="Portfolio metrics"></section>

        <section class="map-section" aria-label="Candidate location map">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Service Territory</p>
              <h2>Candidate Site Map</h2>
            </div>
            <div class="legend">
              <span><i class="legend-dot high"></i>High</span>
              <span><i class="legend-dot medium"></i>Medium</span>
              <span><i class="legend-dot watch"></i>Watch</span>
            </div>
          </div>
          <div class="map-canvas" id="map-canvas"></div>
        </section>

        <section class="recommendation-section" aria-label="Planning recommendations">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Planning Agent</p>
              <h2>Recommendations</h2>
            </div>
          </div>
          <div class="recommendations" id="recommendations"></div>
        </section>

        <section class="table-section" aria-label="Ranked candidate sites">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Ranked Pipeline</p>
              <h2>Site Portfolio</h2>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Site</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Payback</th>
                  <th>Annual Net</th>
                </tr>
              </thead>
              <tbody id="site-table"></tbody>
            </table>
          </div>
        </section>

        <aside class="detail-panel" id="detail-panel" aria-label="Selected site details"></aside>
      </main>
    </div>
  `;

  const scenarioSelect = root.querySelector("#scenario-select");
  const uploadInput = root.querySelector("#site-upload");

  scenarioSelect.addEventListener("change", (event) => {
    activeScenario = event.target.value;
    handlers.onScenarioChange(activeScenario);
  });

  uploadInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) {
      handlers.onFileUpload(file, activeScenario);
    }
  });

  return {
    render({ portfolio, recommendations }) {
      const ranked = portfolio.rankedCandidates;
      selectedSiteId = ranked.some((site) => site.id === selectedSiteId)
        ? selectedSiteId
        : ranked[0]?.id || null;
      renderMetrics(root, portfolio.metrics);
      renderMap(root, ranked, selectedSiteId, (siteId) => {
        selectedSiteId = siteId;
        renderPortfolio(root, portfolio, recommendations, selectedSiteId);
      });
      renderRecommendations(root, recommendations);
      renderTable(root, ranked, selectedSiteId, (siteId) => {
        selectedSiteId = siteId;
        renderPortfolio(root, portfolio, recommendations, selectedSiteId);
      });
      renderDetails(root, ranked.find((site) => site.id === selectedSiteId) || ranked[0]);
    },
    renderError(message) {
      root.querySelector("#recommendations").innerHTML = `<div class="notice">${escapeHtml(message)}</div>`;
    }
  };
}

function renderPortfolio(root, portfolio, recommendations, selectedSiteId) {
  const ranked = portfolio.rankedCandidates;
  renderMetrics(root, portfolio.metrics);
  renderMap(root, ranked, selectedSiteId, (siteId) => {
    renderPortfolio(root, portfolio, recommendations, siteId);
  });
  renderRecommendations(root, recommendations);
  renderTable(root, ranked, selectedSiteId, (siteId) => {
    renderPortfolio(root, portfolio, recommendations, siteId);
  });
  renderDetails(root, ranked.find((site) => site.id === selectedSiteId) || ranked[0]);
}

function renderMetrics(root, metrics) {
  root.querySelector("#metric-grid").innerHTML = `
    ${metricCard("Recommended Sites", metrics.recommendedCount.toString())}
    ${metricCard("Average Priority", formatNumber(metrics.averageScore))}
    ${metricCard("Annual Net", formatCurrency(metrics.totalAnnualNetRevenue))}
    ${metricCard("Weighted Payback", `${formatNumber(metrics.weightedPayback)} yrs`)}
  `;
}

function metricCard(label, value) {
  return `
    <article class="metric-card">
      <p>${label}</p>
      <strong>${value}</strong>
    </article>
  `;
}

function renderMap(root, sites, selectedSiteId, onSelect) {
  const mapCanvas = root.querySelector("#map-canvas");
  const bounds = getBounds(sites);
  const pins = sites.map((site, index) => {
    const position = projectToMap(site, bounds);
    const selectedClass = site.id === selectedSiteId ? " is-selected" : "";

    return `
      <button
        class="map-pin ${priorityClasses[site.priority]}${selectedClass}"
        data-site-id="${escapeHtml(site.id)}"
        style="left:${position.x}%; top:${position.y}%"
        aria-label="${escapeHtml(site.name)} score ${site.score.totalScore}"
      >
        <span>${index + 1}</span>
      </button>
    `;
  }).join("");

  mapCanvas.innerHTML = `
    <div class="map-grid"></div>
    <svg class="map-lines" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M6 72 C22 61, 31 66, 42 52 S69 31, 94 25" />
      <path d="M15 17 C31 28, 39 39, 52 44 S75 49, 89 64" />
      <path d="M28 91 C34 72, 39 57, 51 42 S67 22, 72 7" />
      <path d="M7 44 C28 45, 43 39, 61 35 S80 36, 96 42" />
    </svg>
    <div class="zone zone-a">Downtown Load Pocket</div>
    <div class="zone zone-b">Equity Access Zone</div>
    <div class="zone zone-c">Fleet & Corridor Zone</div>
    ${pins}
  `;

  mapCanvas.querySelectorAll(".map-pin").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.siteId));
  });
}

function renderRecommendations(root, recommendations) {
  root.querySelector("#recommendations").innerHTML = recommendations.map((recommendation) => `
    <article class="recommendation">
      <h3>${escapeHtml(recommendation.title)}</h3>
      <p>${escapeHtml(recommendation.body)}</p>
    </article>
  `).join("");
}

function renderTable(root, sites, selectedSiteId, onSelect) {
  const tableBody = root.querySelector("#site-table");

  tableBody.innerHTML = sites.map((site, index) => `
    <tr class="${site.id === selectedSiteId ? "is-selected" : ""}" data-site-id="${escapeHtml(site.id)}">
      <td>${index + 1}</td>
      <td>
        <button class="table-site-button" data-site-id="${escapeHtml(site.id)}">
          <strong>${escapeHtml(site.name)}</strong>
          <span>${escapeHtml(site.city)}</span>
        </button>
      </td>
      <td>${escapeHtml(site.locationType)}</td>
      <td><span class="score-pill ${priorityClasses[site.priority]}">${formatNumber(site.score.totalScore)}</span></td>
      <td>${formatNumber(site.roi.paybackYears)} yrs</td>
      <td>${formatCurrency(site.roi.annualNetRevenue)}</td>
    </tr>
  `).join("");

  tableBody.querySelectorAll(".table-site-button").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.siteId));
  });
}

function renderDetails(root, site) {
  const detailPanel = root.querySelector("#detail-panel");

  if (!site) {
    detailPanel.innerHTML = `<div class="notice">Load candidate sites to view details.</div>`;
    return;
  }

  detailPanel.innerHTML = `
    <p class="eyebrow">Selected Site</p>
    <h2>${escapeHtml(site.name)}</h2>
    <p class="detail-location">${escapeHtml(site.city)} &middot; ${escapeHtml(site.locationType)}</p>
    <div class="detail-score">
      <span>${formatNumber(site.score.totalScore)}</span>
      <strong>${site.priority} Priority</strong>
    </div>
    <dl class="detail-list">
      <div><dt>Grid Capacity</dt><dd>${Math.round(site.gridCapacityKw)} kW</dd></div>
      <div><dt>Nearby Chargers</dt><dd>${site.nearbyChargers}</dd></div>
      <div><dt>Charger Ports</dt><dd>${site.chargerPorts}</dd></div>
      <div><dt>Net Capex</dt><dd>${formatCurrency(site.roi.netCapex)}</dd></div>
      <div><dt>Annual ROI</dt><dd>${formatPercent(site.roi.annualRoi)}</dd></div>
      <div><dt>Utilization</dt><dd>${formatPercent(site.roi.utilizationRate)}</dd></div>
    </dl>
    <div class="driver-list">
      <h3>Top Drivers</h3>
      ${site.score.drivers.map((driver) => `<span>${escapeHtml(driver)}</span>`).join("")}
    </div>
  `;
}

function getBounds(sites) {
  const latitudes = sites.map((site) => site.latitude);
  const longitudes = sites.map((site) => site.longitude);

  return {
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
    minLng: Math.min(...longitudes),
    maxLng: Math.max(...longitudes)
  };
}

function projectToMap(site, bounds) {
  const lngRange = bounds.maxLng - bounds.minLng || 1;
  const latRange = bounds.maxLat - bounds.minLat || 1;

  return {
    x: clamp(((site.longitude - bounds.minLng) / lngRange) * 78 + 11, 8, 92),
    y: clamp((1 - (site.latitude - bounds.minLat) / latRange) * 76 + 12, 8, 88)
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value) {
  return Number(value).toFixed(1);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
