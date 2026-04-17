import { analyzeLocations, compareLocations, normalizeLocationInput, sampleLocations } from "@ev-planning/shared";

export class LocationService {
  constructor({ repository, recommendationService }) {
    this.repository = repository;
    this.recommendationService = recommendationService;
  }

  async list() {
    const locations = await this.repository.list();
    return analyzeLocations(locations);
  }

  async seed() {
    const enriched = await this.#scoreAndSummarize(sampleLocations);
    await this.repository.upsertMany(enriched.map(toDatabaseRecord));
    return this.list();
  }

  async upload(locations) {
    const enriched = await this.#scoreAndSummarize(locations);
    await this.repository.upsertMany(enriched.map(toDatabaseRecord));
    return this.list();
  }

  async regenerateRecommendations() {
    const locations = await this.list();
    const enriched = await this.#scoreAndSummarize(locations);
    await this.repository.upsertMany(enriched.map(toDatabaseRecord));
    return this.list();
  }

  async compare(locationIds) {
    const result = compareLocations(await this.repository.list(), locationIds);

    if (result.missingIds?.length) {
      return null;
    }

    return result;
  }

  async #scoreAndSummarize(rawLocations) {
    const enriched = analyzeLocations(rawLocations.map((location) => normalizeLocationInput(location)));

    return Promise.all(
      enriched.map(async (location) => ({
        ...location,
        recommendation_summary: await this.recommendationService.summarize(location)
      }))
    );
  }
}

function toDatabaseRecord(location) {
  return {
    id: location.id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    population_density: location.population_density,
    energy_demand: location.energy_demand,
    traffic_score: location.traffic_score,
    grid_readiness: location.grid_readiness,
    ev_adoption_score: location.ev_adoption_score,
    roi_estimate: location.roi_estimate,
    recommendation_summary: location.recommendation_summary,
    created_at: location.created_at
  };
}
