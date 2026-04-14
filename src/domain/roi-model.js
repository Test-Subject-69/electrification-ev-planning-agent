const DEFAULT_RETAIL_RATE = 0.42;
const DEFAULT_ENERGY_COST = 0.16;
const AVERAGE_SESSION_KWH = 28;
const DAYS_PER_YEAR = 365;
const OPERATING_COST_RATE = 0.18;

export function estimateRoi(candidate, totalScore, options = {}) {
  const retailRate = options.retailRatePerKwh ?? DEFAULT_RETAIL_RATE;
  const energyCost = options.energyCostPerKwh ?? DEFAULT_ENERGY_COST;
  const utilizationRate = estimateUtilization(candidate, totalScore);
  const dailySessions = candidate.chargerPorts * utilizationRate * 7.5;
  const annualGrossRevenue = dailySessions * AVERAGE_SESSION_KWH * DAYS_PER_YEAR * retailRate;
  const annualEnergyCost = dailySessions * AVERAGE_SESSION_KWH * DAYS_PER_YEAR * energyCost;
  const annualOperatingCost = annualGrossRevenue * OPERATING_COST_RATE;
  const incentiveEstimate = candidate.estimatedCapex * (candidate.utilityIncentive / 100) * 0.28;
  const netCapex = Math.max(candidate.estimatedCapex - incentiveEstimate, candidate.estimatedCapex * 0.55);
  const annualNetRevenue = Math.max(annualGrossRevenue - annualEnergyCost - annualOperatingCost, 0);
  const paybackYears = annualNetRevenue > 0 ? netCapex / annualNetRevenue : Number.POSITIVE_INFINITY;
  const annualRoi = netCapex > 0 ? annualNetRevenue / netCapex : 0;

  return {
    utilizationRate,
    dailySessions,
    annualGrossRevenue,
    annualEnergyCost,
    annualOperatingCost,
    incentiveEstimate,
    netCapex,
    annualNetRevenue,
    paybackYears,
    annualRoi
  };
}

function estimateUtilization(candidate, totalScore) {
  const demandSignal = clamp(candidate.dailyTraffic / 50000, 0, 1);
  const adoptionSignal = candidate.evAdoptionScore / 100;
  const readinessSignal = candidate.siteReadiness / 100;
  const rawRate = 0.1 + totalScore * 0.0036 + demandSignal * 0.1 + adoptionSignal * 0.07 + readinessSignal * 0.04;

  return clamp(rawRate, 0.12, 0.72);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
