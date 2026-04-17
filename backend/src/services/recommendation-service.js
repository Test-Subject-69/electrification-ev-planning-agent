import { buildRecommendationBrief } from "@ev-planning/shared";
import { AiTextService } from "./ai-text-service.js";

export class RecommendationService {
  constructor() {
    this.ai = new AiTextService();
    this.mode = this.ai.isConfigured ? "ai" : "fallback";
  }

  async summarize(location) {
    const deterministicBrief = buildRecommendationBrief(location);

    if (!this.ai.isConfigured) {
      return deterministicBrief;
    }

    try {
      return await this.ai.generateText({
        instructions: [
          "You write concise EV infrastructure planning recommendations for utility and program leadership.",
          "Use only the supplied deterministic recommendation and location metrics.",
          "Do not invent utility capacity, land ownership, incentives, charger counts, permitting, or construction facts.",
          "Keep the output to two short executive-ready sentences."
        ].join(" "),
        input: buildPrompt(location, deterministicBrief),
        maxTokens: 120
      });
    } catch {
      return deterministicBrief;
    }
  }
}

function buildPrompt(location, deterministicBrief) {
  const analysis = location.analysis || {};

  return [
    `Deterministic recommendation: ${deterministicBrief}`,
    `Location: ${location.name}`,
    `Score: ${location.score}`,
    `Priority: ${location.priority}`,
    `Rank: ${analysis.rank || "Not available"}`,
    `Population density: ${location.population_density}`,
    `Energy demand: ${location.energy_demand}`,
    `Traffic score: ${location.traffic_score}`,
    `Grid readiness: ${location.grid_readiness}`,
    `EV adoption score: ${location.ev_adoption_score}`,
    `ROI estimate: ${location.roi_estimate}%`,
    `Risk flags: ${(analysis.risk_flags || []).map((risk) => risk.message).join("; ") || "None flagged"}`,
    `Next steps: ${(analysis.next_steps || []).join("; ") || "Confirm site feasibility before committing capital"}`
  ].join("\n");
}
