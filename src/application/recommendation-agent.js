export function generateRecommendations(portfolio) {
  const [topCandidate, secondCandidate] = portfolio.rankedCandidates;

  if (!topCandidate) {
    return [
      {
        title: "Load candidate sites",
        body: "Add CSV or JSON location data to rank rollout options."
      }
    ];
  }

  const recommendations = [
    {
      title: `Prioritize ${topCandidate.name}`,
      body: `${topCandidate.city} has the strongest combined score, with ${topCandidate.score.drivers.join(", ")} driving the recommendation.`
    },
    {
      title: "Stage utility engagement early",
      body: `${topCandidate.name} needs ${Math.round(topCandidate.chargerPorts * 80)} kW or more of practical service capacity. Begin hosting-capacity and make-ready review before final site control.`
    },
    {
      title: "Package the portfolio around outcomes",
      body: `The current scenario estimates ${formatCurrency(portfolio.metrics.totalAnnualNetRevenue)} in annual net revenue and a ${formatYears(portfolio.metrics.weightedPayback)} weighted payback. Use the top-ranked sites for partner and funding conversations.`
    }
  ];

  const equityCandidate = portfolio.rankedCandidates.find((candidate) => candidate.equityIndex >= 85);
  if (equityCandidate) {
    recommendations.push({
      title: `Advance equity access at ${equityCandidate.name}`,
      body: `${equityCandidate.city} has a high equity need and limited nearby charging. Pair deployment with community outreach and charger uptime commitments.`
    });
  }

  if (secondCandidate) {
    recommendations.push({
      title: `Keep ${secondCandidate.name} in the near-term pipeline`,
      body: `${secondCandidate.locationType} sites can support a fast follow once permitting, incentive timing, and final utility costs are confirmed.`
    });
  }

  return recommendations.slice(0, 5);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatYears(value) {
  return `${value.toFixed(1)} years`;
}
