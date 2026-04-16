import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";
const supabaseKeyType = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? "service-role"
  : supabaseKey
    ? "publishable"
    : "none";
const supabaseAuthRequired = parseBoolean(
  process.env.SUPABASE_AUTH_REQUIRED,
  Boolean(supabaseUrl && supabaseKey)
);

export const env = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  supabaseUrl,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  supabaseKey,
  supabaseKeyType,
  supabaseAuthRequired,
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini"
};

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabaseKey);
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
}
