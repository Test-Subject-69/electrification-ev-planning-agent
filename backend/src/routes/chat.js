import { Router } from "express";
import { LocationChatService } from "../services/location-chat-service.js";

export function createChatRouter({ repository }) {
  const router = Router();
  const service = new LocationChatService({ repository });

  router.post("/location", asyncHandler(async (request, response) => {
    const locationId = String(request.body?.locationId || "").trim();
    const question = String(request.body?.question || "").trim();
    const locationSnapshot = getLocationSnapshot(request.body?.location);

    if (!locationId) {
      response.status(400).json({ error: "locationId is required." });
      return;
    }

    const result = await service.explainLocation({ locationId, question, locationSnapshot });
    if (!result) {
      response.status(404).json({ error: "Location not found." });
      return;
    }

    response.json(result);
  }));

  return router;
}

function getLocationSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
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
