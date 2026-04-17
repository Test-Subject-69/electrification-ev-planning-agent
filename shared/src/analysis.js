import { enrichLocation, getScoreBreakdown, normalizeLocationInput } from "./scoring.js";

const METRICS = [
  { key: "score", label: "Score" },
  { key: "roi_estimate", label: "ROI" },
  { key: "population_density", label: "Population density" },
  { key: "energy_demand", label: "Energy demand" },
  { key: "traffic_score", label: "Traffic" },
  { key: "grid_readiness", label: "Grid readiness" },
  { key: "ev_adoption_score", label: "EV adoption" }
];

const RISK_RULES = [
  {
    key: "missing_data",
    severity: "High",
    test: (location) =>
      ["population_density", "energy_demand", "traffic_score", "grid_readiness", "ev_adoption_score"].some(
        (field) => Number(location[field]) <= 0
      ),
    message: "One or more planning inputs are missing or zero."
  },
  {
    key: "low_grid_readiness",
    severity: "High",
    test: (location) => location.grid_readiness < 65,
    message: "Grid readiness is below the preferred planning threshold."
  },
  {
    key: "low_energy_demand",
    severity: "Medium",
    test: (location) => location.energy_demand < 55,
    message: "Energy demand is weaker than preferred for near-term charger investment."
  },
  {
    key: "low_traffic",
    severity: "Medium",
    test: (location) => location.traffic_score < 60,
    message: "Traffic signal is low and may limit charger utilization."
  },
  {
    key: "low_ev_adoption",
    severity: "Medium",
    test: (location) => location.ev_adoption_score < 60,
    message: "EV adoption signal is below the preferred planning threshold."
  },
  {
    key: "below_average_roi",
    severity: "Medium",
    test: (location, portfolio) => location.roi_estimate < portfolio.averages.roi_estimate - 3,
    message: "ROI estimate is below the current portfolio average."
  }
];

export function analyzeLocations(inputs) {
  const locations = inputs.map((location) => enrichLocation(normalizeLocationInput(location))).sort(sortByScore);
  const portfolio = buildPortfolio(locations);

  return locations.map((location, index) => ({
    ...location,
    analysis: buildLocationAnalysis(location, portfolio, index + 1)
  }));
}

export function analyzeLocation(location, allLocations) {
  const locations = analyzeLocations(includeLocation(allLocations || [], location));
  const lookupKey = normalizeLookupKey(location.id || location.name);

  return locations.find((candidate) => {
    return [candidate.id, candidate.name].some((value) => normalizeLookupKey(value) === lookupKey);
  });
}

export function compareLocations(inputs, locationIds) {
  const analyzedLocations = analyzeLocations(inputs);
  const selectedLocations = locationIds.map((locationId) => {
    return analyzedLocations.find((location) => isSameLocation(location, locationId));
  });
  const missingIds = locationIds.filter((_locationId, index) => !selectedLocations[index]);

  if (missingIds.length) {
    return { missingIds };
  }

  const selected = selectedLocations.filter(Boolean);
  const bestByMetric = Object.fromEntries(
    METRICS.map((metric) => [metric.key, getBestMetricLocation(selected, metric)])
  );
  const winner = getRecommendedWinner(selected);

  return {
    selected_locations: selected.map(toComparisonLocation),
    best_by_metric: bestByMetric,
    recommended_winner: winner,
    summary: buildComparisonSummary(winner, selected.length),
    sources: ["Selected location metrics", "Scoring model", "Portfolio comparison"]
  };
}

export function buildRecommendationBrief(location) {
  const analyzedLocation = location.analysis ? location : enrichLocation(location);
  const analysis =
    analyzedLocation.analysis || buildLocationAnalysis(analyzedLocation, buildPortfolio([analyzedLocation]), 1);
  const strength = analysis.strengths[0]?.message || "the site has a balanced planning profile";
  const risk = analysis.risk_flags[0]?.message || "no major scoring risk is currently flagged";
  const nextStep = analysis.next_steps[0] || "confirm utility coordination, site control, and installation cost.";

  return `${analyzedLocation.name} is ranked ${analysis.rank} of ${analysis.total_locations} with ${analyzedLocation.priority.toLowerCase()} priority. ${strength}. Main risk: ${risk}. Next step: ${nextStep}`;
}

function buildLocationAnalysis(location, portfolio, rank) {
  const strengths = getStrengths(location, portfolio);
  const riskFlags = getRiskFlags(location, portfolio);
  const nextSteps = getNextSteps(location, riskFlags);

  return {
    rank,
    total_locations: portfolio.totalLocations,
    score_breakdown: getScoreBreakdown(location),
    portfolio_comparison: getPortfolioComparison(location, portfolio),
    strengths,
    risk_flags: riskFlags,
    next_steps: nextSteps,
    recommendation_brief: buildBrief(location, rank, portfolio.totalLocations, strengths, riskFlags, nextSteps)
  };
}

function buildPortfolio(locations) {
  return {
    totalLocations: locations.length,
    averages: Object.fromEntries(METRICS.map((metric) => [metric.key, average(locations.map((location) => location[metric.key]))]))
  };
}

function getPortfolioComparison(location, portfolio) {
  return Object.fromEntries(
    METRICS.map((metric) => {
      const value = round(location[metric.key]);
      const averageValue = portfolio.averages[metric.key];

      return [
        metric.key,
        {
          label: metric.label,
          value,
          average: averageValue,
          difference: round(value - averageValue),
          position: compareToAverage(value, averageValue)
        }
      ];
    })
  );
}

function getStrengths(location, portfolio) {
  const strengths = METRICS.filter((metric) => metric.key !== "score")
    .map((metric) => {
      const value = round(location[metric.key]);
      const averageValue = portfolio.averages[metric.key];
      const difference = round(value - averageValue);

      return {
        key: metric.key,
        label: metric.label,
        value,
        average: averageValue,
        difference,
        message: `${metric.label} is ${compareToAverage(value, averageValue)} the portfolio average`
      };
    })
    .filter((metric) => metric.difference >= 3)
    .sort((left, right) => right.difference - left.difference)
    .slice(0, 3);

  if (strengths.length) {
    return strengths;
  }

  return METRICS.filter((metric) => !["score", "population_density"].includes(metric.key))
    .map((metric) => ({
      key: metric.key,
      label: metric.label,
      value: round(location[metric.key]),
      average: portfolio.averages[metric.key],
      difference: round(location[metric.key] - portfolio.averages[metric.key]),
      message: `${metric.label} is one of the stronger planning signals`
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 2);
}

function getRiskFlags(location, portfolio) {
  return RISK_RULES.filter((rule) => rule.test(location, portfolio)).map((rule) => ({
    key: rule.key,
    severity: rule.severity,
    message: rule.message
  }));
}

function getNextSteps(location, riskFlags) {
  const steps = [];

  if (riskFlags.some((risk) => risk.key === "missing_data")) {
    steps.push("Complete missing planning inputs before using the site in a final investment decision.");
  }

  if (riskFlags.some((risk) => risk.key === "low_grid_readiness")) {
    steps.push("Coordinate with the utility to validate grid capacity and upgrade requirements.");
  }

  if (riskFlags.some((risk) => ["low_energy_demand", "low_traffic", "low_ev_adoption"].includes(risk.key))) {
    steps.push("Validate expected utilization with local demand, traffic, and adoption assumptions.");
  }

  if (riskFlags.some((risk) => risk.key === "below_average_roi")) {
    steps.push("Review installation cost, funding options, and operating assumptions before prioritizing.");
  }

  if (location.priority === "High") {
    steps.push("Advance site feasibility, utility coordination, and funding review for near-term deployment.");
  } else if (location.priority === "Medium") {
    steps.push("Keep the site in the planning pipeline while validating cost and readiness assumptions.");
  } else {
    steps.push("Monitor the site and revisit when demand, adoption, or grid readiness improves.");
  }

  return [...new Set(steps)].slice(0, 4);
}

function buildBrief(location, rank, totalLocations, strengths, riskFlags, nextSteps) {
  const strength = strengths[0]?.message || "the site has a balanced planning profile";
  const risk = riskFlags[0]?.message || "no major scoring risk is currently flagged";
  const nextStep = nextSteps[0] || "Confirm site feasibility before committing capital.";

  return `${location.name} ranks ${rank} of ${totalLocations}. ${strength}. Main risk: ${risk}. Next step: ${nextStep}`;
}

function toComparisonLocation(location) {
  return {
    id: location.id,
    name: location.name,
    score: location.score,
    priority: location.priority,
    roi_estimate: location.roi_estimate,
    population_density: location.population_density,
    energy_demand: location.energy_demand,
    traffic_score: location.traffic_score,
    grid_readiness: location.grid_readiness,
    ev_adoption_score: location.ev_adoption_score,
    rank: location.analysis.rank,
    risk_count: location.analysis.risk_flags.length,
    strengths: location.analysis.strengths,
    risk_flags: location.analysis.risk_flags,
    next_steps: location.analysis.next_steps
  };
}

function getBestMetricLocation(locations, metric) {
  const best = [...locations].sort((left, right) => Number(right[metric.key]) - Number(left[metric.key]))[0];

  return {
    location_id: best.id,
    location_name: best.name,
    label: metric.label,
    value: round(best[metric.key])
  };
}

function getRecommendedWinner(locations) {
  const winner = [...locations]
    .map((location) => ({
      location,
      comparison_score: round(
        location.score * 0.45 +
          location.roi_estimate * 0.25 +
          location.grid_readiness * 0.15 +
          location.energy_demand * 0.1 +
          location.traffic_score * 0.05 -
          location.analysis.risk_flags.length * 2
      )
    }))
    .sort((left, right) => right.comparison_score - left.comparison_score)[0];

  return {
    location_id: winner.location.id,
    location_name: winner.location.name,
    comparison_score: winner.comparison_score,
    reason: `${winner.location.name} has the strongest combined score, ROI, grid readiness, demand, and risk profile.`
  };
}

function buildComparisonSummary(winner, count) {
  return `${winner.location_name} is the recommended option across ${count} compared locations based on deterministic score, ROI, grid readiness, demand, traffic, and risk count.`;
}

function includeLocation(locations, location) {
  const normalizedLocation = normalizeLocationInput(location);
  const exists = locations.some((candidate) => isSameLocation(candidate, normalizedLocation.id));

  return exists ? locations : [...locations, normalizedLocation];
}

function isSameLocation(location, locationId) {
  const lookupKey = normalizeLookupKey(locationId);

  return [location.id, location.name].some((value) => normalizeLookupKey(value) === lookupKey);
}

function compareToAverage(value, averageValue) {
  if (value >= averageValue + 3) {
    return "above";
  }

  if (value <= averageValue - 3) {
    return "below";
  }

  return "near";
}

function average(values) {
  const validValues = values.map(Number).filter(Number.isFinite);
  if (!validValues.length) {
    return 0;
  }

  return round(validValues.reduce((sum, value) => sum + value, 0) / validValues.length);
}

function normalizeLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sortByScore(left, right) {
  return right.score - left.score;
}

function round(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}
