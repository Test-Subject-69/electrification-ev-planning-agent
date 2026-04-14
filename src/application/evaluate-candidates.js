import { scoreCandidate, SCENARIO_WEIGHTS } from "../domain/scoring-model.js";
import { estimateRoi } from "../domain/roi-model.js";

export function evaluateCandidates(candidates, scenario = "balanced") {
  const weights = SCENARIO_WEIGHTS[scenario] || SCENARIO_WEIGHTS.balanced;
  const rankedCandidates = candidates
    .map((candidate) => {
      const score = scoreCandidate(candidate, weights);
      const roi = estimateRoi(candidate, score.totalScore);

      return {
        ...candidate,
        score,
        roi,
        priority: getPriority(score.totalScore)
      };
    })
    .sort((left, right) => right.score.totalScore - left.score.totalScore);

  return {
    scenario,
    weights,
    rankedCandidates,
    metrics: calculatePortfolioMetrics(rankedCandidates)
  };
}

function getPriority(score) {
  if (score >= 76) {
    return "High";
  }

  if (score >= 62) {
    return "Medium";
  }

  return "Watch";
}

function calculatePortfolioMetrics(candidates) {
  const recommended = candidates.filter((candidate) => candidate.priority === "High");
  const totalAnnualNetRevenue = candidates.reduce((sum, candidate) => sum + candidate.roi.annualNetRevenue, 0);
  const totalNetCapex = candidates.reduce((sum, candidate) => sum + candidate.roi.netCapex, 0);
  const averageScore = average(candidates.map((candidate) => candidate.score.totalScore));
  const weightedPayback = totalAnnualNetRevenue > 0 ? totalNetCapex / totalAnnualNetRevenue : 0;

  return {
    recommendedCount: recommended.length,
    averageScore,
    totalAnnualNetRevenue,
    totalNetCapex,
    weightedPayback,
    topCandidateName: candidates[0]?.name || "No candidate selected"
  };
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
