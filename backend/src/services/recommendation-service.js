import OpenAI from "openai";
import { env } from "../config/env.js";

export class RecommendationService {
  constructor() {
    this.mode = env.openaiApiKey ? "openai" : "fallback";
    this.client = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;
  }

  async summarize(location) {
    if (!this.client) {
      return buildFallbackSummary(location);
    }

    try {
      const response = await this.client.responses.create({
        model: env.openaiModel,
        instructions:
          "You write concise EV infrastructure planning recommendations for utility and program leadership. Keep the output to one executive-ready sentence.",
        input: buildPrompt(location),
        max_output_tokens: 120
      });

      return normalizeSummary(response.output_text || buildFallbackSummary(location));
    } catch (error) {
      console.warn("OpenAI recommendation failed; using deterministic fallback.", error);
      return buildFallbackSummary(location);
    }
  }
}

function buildPrompt(location) {
  return [
    `Location: ${location.name}`,
    `Score: ${location.score}`,
    `Priority: ${location.priority}`,
    `Population density: ${location.population_density}`,
    `Energy demand: ${location.energy_demand}`,
    `Traffic score: ${location.traffic_score}`,
    `Grid readiness: ${location.grid_readiness}`,
    `EV adoption score: ${location.ev_adoption_score}`,
    `ROI estimate: ${location.roi_estimate}%`
  ].join("\n");
}

function buildFallbackSummary(location) {
  if (location.priority === "High") {
    return `${location.name} is a strong near-term charger candidate because demand, traffic, and grid readiness support a focused investment case.`;
  }

  if (location.priority === "Medium") {
    return `${location.name} should stay in the planning pipeline while utility costs, site control, and adoption signals are refined.`;
  }

  return `${location.name} is best monitored until demand, adoption, or grid readiness improves enough to support deployment.`;
}

function normalizeSummary(value) {
  return String(value).trim().replace(/\s+/g, " ");
}
