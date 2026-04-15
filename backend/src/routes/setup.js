import { Router } from "express";
import { env } from "../config/env.js";

export function createSetupRouter({ repository, recommendationService }) {
  const router = Router();

  router.get("/status", (_request, response) => {
    response.json({
      services: {
        supabase: {
          configured: repository.mode === "supabase",
          mode: repository.mode,
          keyType: env.supabaseKeyType
        },
        openai: {
          configured: recommendationService.mode === "openai",
          mode: recommendationService.mode,
          model: env.openaiModel
        }
      },
      requiredEnvironment: {
        frontend: [
          "NEXT_PUBLIC_API_URL",
          "NEXT_PUBLIC_SUPABASE_URL",
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          "NEXT_PUBLIC_MAP_TILE_URL",
          "NEXT_PUBLIC_MAP_ATTRIBUTION"
        ],
        backend: [
          "SUPABASE_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
          "SUPABASE_PUBLISHABLE_KEY",
          "OPENAI_API_KEY",
          "OPENAI_MODEL"
        ]
      },
      database: {
        table: "locations",
        schema: "docs/supabase-schema.sql"
      }
    });
  });

  return router;
}
