import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

const TABLE_NAME = "locations";

export class SupabaseLocationRepository {
  mode = "supabase";

  constructor() {
    this.client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
  }

  async list() {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Unable to read locations: ${error.message}`);
    }

    return data || [];
  }

  async replaceAll(locations) {
    const { error: deleteError } = await this.client
      .from(TABLE_NAME)
      .delete()
      .neq("id", "__never__");

    if (deleteError) {
      throw new Error(`Unable to clear locations: ${deleteError.message}`);
    }

    return this.upsertMany(locations);
  }

  async upsertMany(locations) {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .upsert(locations, { onConflict: "id" })
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Unable to save locations: ${error.message}`);
    }

    return data || [];
  }
}
