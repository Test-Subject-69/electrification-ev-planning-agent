const SCORE_WEIGHTS = {
  populationDensity: 0.18,
  energyDemand: 0.24,
  traffic: 0.22,
  gridReadiness: 0.2,
  evAdoption: 0.16
};

const POPULATION_DENSITY_MAX = 12000;
const ENERGY_DEMAND_MAX = 100;

export function normalizeLocationInput(input) {
  const id = input.id || slugify(input.name);

  return {
    id,
    name: String(input.name || "Unnamed location"),
    latitude: toNumber(input.latitude),
    longitude: toNumber(input.longitude),
    population_density: toNumber(input.population_density),
    energy_demand: toNumber(input.energy_demand),
    traffic_score: clamp(toNumber(input.traffic_score), 0, 100),
    grid_readiness: clamp(toNumber(input.grid_readiness), 0, 100),
    ev_adoption_score: clamp(toNumber(input.ev_adoption_score), 0, 100),
    roi_estimate: toNumber(input.roi_estimate ?? 0),
    recommendation_summary: String(input.recommendation_summary || ""),
    created_at: input.created_at || new Date().toISOString()
  };
}

export function enrichLocation(input) {
  const location = normalizeLocationInput(input);
  const score = calculateLocationScore(location);
  const roiEstimate = estimateLocationRoi(location, score);

  return {
    ...location,
    roi_estimate: roiEstimate,
    score,
    priority: getPriority(score)
  };
}

export function calculateLocationScore(location) {
  const populationDensityScore = normalize(location.population_density, 0, POPULATION_DENSITY_MAX);
  const energyDemandScore = normalize(location.energy_demand, 0, ENERGY_DEMAND_MAX);

  const score =
    populationDensityScore * SCORE_WEIGHTS.populationDensity +
    energyDemandScore * SCORE_WEIGHTS.energyDemand +
    location.traffic_score * SCORE_WEIGHTS.traffic +
    location.grid_readiness * SCORE_WEIGHTS.gridReadiness +
    location.ev_adoption_score * SCORE_WEIGHTS.evAdoption;

  return round(score);
}

export function estimateLocationRoi(location, score) {
  const estimatedCapex =
    175000 +
    location.energy_demand * 1250 +
    Math.max(0, 100 - location.grid_readiness) * 900;
  const annualRevenue =
    location.energy_demand * 365 * 0.31 +
    location.traffic_score * 950 +
    location.ev_adoption_score * 820 +
    score * 1150;
  const annualOperatingCost = estimatedCapex * 0.085;
  const annualNetValue = Math.max(annualRevenue - annualOperatingCost, 0);

  return round((annualNetValue / estimatedCapex) * 100);
}

function getPriority(score) {
  if (score >= 75) {
    return "High";
  }

  if (score >= 62) {
    return "Medium";
  }

  return "Watch";
}

function normalize(value, min, max) {
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function slugify(value) {
  return String(value || "location")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
