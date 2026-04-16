import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { createLocationRouter } from "./routes/locations.js";
import { createSetupRouter } from "./routes/setup.js";
import { createRepository } from "./repositories/create-repository.js";
import { requireSupabaseAuth } from "./middleware/require-auth.js";
import { RecommendationService } from "./services/recommendation-service.js";

export function createApp() {
  const app = express();
  const repository = createRepository();
  const recommendationService = new RecommendationService();

  app.use(cors({ origin: env.frontendOrigin }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      repository: repository.mode,
      ai: recommendationService.mode,
      phase2: {
        supabaseConfigured: repository.mode === "supabase",
        openaiConfigured: recommendationService.mode === "openai",
        supabaseAuthRequired: env.supabaseAuthRequired
      }
    });
  });

  app.use("/api/setup", createSetupRouter({ repository, recommendationService }));
  app.use("/api/locations", requireSupabaseAuth, createLocationRouter({ repository, recommendationService }));

  app.use((error, _request, response, _next) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    response.status(500).json({ error: message });
  });

  return app;
}
