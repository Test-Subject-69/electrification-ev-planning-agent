export const SCORE_WEIGHTS = {
  populationDensity: 0.18,
  energyDemand: 0.24,
  traffic: 0.22,
  gridReadiness: 0.2,
  evAdoption: 0.16
};

const POPULATION_DENSITY_MAX = 12000;
const ENERGY_DEMAND_MAX = 100;
const SCORE_FACTORS = [
  {
    key: "population_density",
    label: "Population density",
    weight: SCORE_WEIGHTS.populationDensity,
    getRawValue: (location) => location.population_density,
    getNormalizedValue: (location) => normalize(location.population_density, 0, POPULATION_DENSITY_MAX)
  },
  {
    key: "energy_demand",
    label: "Energy demand",
    weight: SCORE_WEIGHTS.energyDemand,
    getRawValue: (location) => location.energy_demand,
    getNormalizedValue: (location) => normalize(location.energy_demand, 0, ENERGY_DEMAND_MAX)
  },
  {
    key: "traffic_score",
    label: "Traffic",
    weight: SCORE_WEIGHTS.traffic,
    getRawValue: (location) => location.traffic_score,
    getNormalizedValue: (location) => location.traffic_score
  },
  {
    key: "grid_readiness",
    label: "Grid readiness",
    weight: SCORE_WEIGHTS.gridReadiness,
    getRawValue: (location) => location.grid_readiness,
    getNormalizedValue: (location) => location.grid_readiness
  },
  {
    key: "ev_adoption_score",
    label: "EV adoption",
    weight: SCORE_WEIGHTS.evAdoption,
    getRawValue: (location) => location.ev_adoption_score,
    getNormalizedValue: (location) => location.ev_adoption_score
  }
];

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
  const normalizedLocation = normalizeLocationInput(location);

  return calculateScoreFromLocation(normalizedLocation);
}

export function getScoreBreakdown(input) {
  const location = normalizeLocationInput(input);
  const score = calculateScoreFromLocation(location);
  const breakdown = SCORE_FACTORS.map((factor) => {
    const normalizedScore = round(factor.getNormalizedValue(location));

    return {
      key: factor.key,
      label: factor.label,
      raw_value: factor.getRawValue(location),
      normalized_score: normalizedScore,
      weight: factor.weight,
      contribution: round(normalizedScore * factor.weight)
    };
  });

  const contributionTotal = round(breakdown.reduce((sum, factor) => sum + factor.contribution, 0));
  const roundingDelta = round(score - contributionTotal);
  if (roundingDelta !== 0 && breakdown.length) {
    breakdown[0] = {
      ...breakdown[0],
      contribution: round(breakdown[0].contribution + roundingDelta)
    };
  }

  return breakdown;
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

function calculateScoreFromLocation(location) {
  const score = SCORE_FACTORS.reduce((sum, factor) => {
    return sum + factor.getNormalizedValue(location) * factor.weight;
  }, 0);

  return round(score);
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
