import assert from "node:assert/strict";
import {
  analyzeLocations,
  calculateLocationScore,
  compareLocations,
  enrichLocation,
  estimateLocationRoi,
  getScoreBreakdown,
  sampleLocations
} from "../src/index.js";

const enriched = enrichLocation(sampleLocations[0]);
const breakdown = getScoreBreakdown(sampleLocations[0]);
const analyzed = analyzeLocations(sampleLocations);
const comparison = compareLocations(sampleLocations, ["detroit-downtown-hub", "riverfront-visitor-lot"]);
const zeroInputAnalysis = analyzeLocations([
  {
    id: "missing-input-site",
    name: "Missing Input Site",
    latitude: 0,
    longitude: 0,
    population_density: 0,
    energy_demand: 0,
    traffic_score: 0,
    grid_readiness: 0,
    ev_adoption_score: 0
  }
]);

assert.ok(calculateLocationScore(sampleLocations[0]) > 70);
assert.ok(estimateLocationRoi(sampleLocations[0], enriched.score) > 0);
assert.equal(enriched.id, "detroit-downtown-hub");
assert.equal(enriched.priority, "High");
assert.equal(breakdown.length, 5);
assert.equal(
  Math.round(breakdown.reduce((sum, factor) => sum + factor.contribution, 0) * 10) / 10,
  enriched.score
);
assert.equal(analyzed[0].analysis.rank, 1);
assert.equal(analyzed[0].analysis.score_breakdown.length, 5);
assert.ok(analyzed[0].analysis.portfolio_comparison.score.average > 0);
assert.ok(analyzed.some((location) => location.analysis.risk_flags.length > 0));
assert.equal(comparison.selected_locations.length, 2);
assert.equal(comparison.best_by_metric.score.location_id, "detroit-downtown-hub");
assert.equal(comparison.recommended_winner.location_id, "detroit-downtown-hub");
assert.ok(zeroInputAnalysis[0].analysis.risk_flags.some((risk) => risk.key === "missing_data"));

console.log("shared scoring tests passed");
