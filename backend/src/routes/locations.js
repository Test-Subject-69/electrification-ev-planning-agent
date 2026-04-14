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
