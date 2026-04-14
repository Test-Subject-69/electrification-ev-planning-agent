import { hasSupabaseConfig } from "../config/env.js";
import { InMemoryLocationRepository } from "./in-memory-location-repository.js";
import { SupabaseLocationRepository } from "./supabase-location-repository.js";

export function createRepository() {
  if (hasSupabaseConfig()) {
    return new SupabaseLocationRepository();
  }

  return new InMemoryLocationRepository();
}
