export const SCENARIO_WEIGHTS = {
  balanced: {
    demand: 0.2,
    equity: 0.18,
    grid: 0.18,
    chargingGap: 0.14,
    adoption: 0.14,
    readiness: 0.1,
    incentive: 0.06
  },
  equity: {
    demand: 0.16,
    equity: 0.28,
    grid: 0.15,
    chargingGap: 0.17,
    adoption: 0.1,
    readiness: 0.08,
    incentive: 0.06
  },
  roi: {
    demand: 0.25,
    equity: 0.1,
    grid: 0.18,
    chargingGap: 0.08,
    adoption: 0.2,
    readiness: 0.12,
    incentive: 0.07
  },
  gridReady: {
    demand: 0.14,
    equity: 0.13,
    grid: 0.3,
    chargingGap: 0.1,
    adoption: 0.11,
    readiness: 0.14,
    incentive: 0.08
  }
};

export function scoreCandidate(candidate, weights = SCENARIO_WEIGHTS.balanced) {
  const components = {
    demand: normalize(candidate.dailyTraffic, 8000, 45000),
    equity: candidate.equityIndex,
    grid: normalize(candidate.gridCapacityKw, 250, 900),
    chargingGap: scoreChargingGap(candidate.nearbyChargers),
    adoption: candidate.evAdoptionScore,
    readiness: candidate.siteReadiness,
    incentive: candidate.utilityIncentive
  };

  const totalScore = Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + components[key] * weight;
  }, 0);

  return {
    totalScore: round(totalScore),
    components: roundComponents(components),
    drivers: getDrivers(components)
  };
}

function scoreChargingGap(nearbyChargers) {
  return clamp(100 - nearbyChargers * 11, 0, 100);
}

function normalize(value, min, max) {
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

function getDrivers(components) {
  return Object.entries(components)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([key]) => labelForDriver(key));
}

function labelForDriver(key) {
  const labels = {
    demand: "demand",
    equity: "equity need",
    grid: "grid readiness",
    chargingGap: "charging gap",
    adoption: "EV adoption",
    readiness: "site readiness",
    incentive: "utility incentive"
  };

  return labels[key] || key;
}

function roundComponents(components) {
  return Object.fromEntries(
    Object.entries(components).map(([key, value]) => [key, round(value)])
  );
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
