import { Router } from "express";
import { LocationService } from "../services/location-service.js";
import { parseLocationsCsv } from "../utils/csv-parser.js";

export function createLocationRouter({ repository, recommendationService }) {
  const router = Router();
  const service = new LocationService({ repository, recommendationService });

  router.get("/", asyncHandler(async (_request, response) => {
    response.json({ locations: await service.list() });
  }));

  router.post("/seed", asyncHandler(async (_request, response) => {
    response.json({ locations: await service.seed() });
  }));

  router.post("/upload", asyncHandler(async (request, response) => {
    const locations = getLocationsFromBody(request.body);
    response.json({ locations: await service.upload(locations) });
  }));

  router.post("/recommendations", asyncHandler(async (_request, response) => {
    response.json({ locations: await service.regenerateRecommendations() });
  }));

  router.post("/compare", asyncHandler(async (request, response) => {
    const locationIds = getLocationIdsFromBody(request.body);

    if (locationIds.length < 2 || locationIds.length > 5) {
      response.status(400).json({ error: "Compare requires 2 to 5 location IDs." });
      return;
    }

    const comparison = await service.compare(locationIds);
    if (!comparison) {
      response.status(404).json({ error: "One or more locations were not found." });
      return;
    }

    response.json(comparison);
  }));

  return router;
}

function asyncHandler(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

function getLocationsFromBody(body) {
  if (Array.isArray(body?.locations)) {
    return body.locations;
  }

  if (typeof body?.csv === "string") {
    return parseLocationsCsv(body.csv);
  }

  throw new Error("Upload requires a locations array or csv string.");
}

function getLocationIdsFromBody(body) {
  if (!Array.isArray(body?.locationIds)) {
    return [];
  }

  return [...new Set(body.locationIds.map((locationId) => String(locationId || "").trim()).filter(Boolean))];
}
