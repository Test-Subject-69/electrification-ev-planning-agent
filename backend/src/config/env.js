import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(configDirectory, "../../..");

dotenv.config({ path: path.join(projectRoot, ".env") });
dotenv.config();

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
const openaiApiKey = process.env.OPENAI_API_KEY || "";
const openaiBaseUrl = process.env.OPENAI_BASE_URL || inferOpenAiBaseUrl(openaiApiKey);
const openaiModel = normalizeOpenAiModel(
  process.env.OPENAI_MODEL || "gpt-4.1-mini",
  openaiApiKey,
  openaiBaseUrl
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
  openaiApiKey,
  openaiBaseUrl,
  openaiModel
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

function inferOpenAiBaseUrl(apiKey) {
  if (String(apiKey).startsWith("sk-or-")) {
    return "https://openrouter.ai/api/v1";
  }

  return "";
}

function normalizeOpenAiModel(model, apiKey, baseUrl) {
  const value = String(model || "").trim() || "gpt-4.1-mini";
  const usesOpenRouter = String(apiKey).startsWith("sk-or-") || String(baseUrl).includes("openrouter.ai");

  if (usesOpenRouter && !value.includes("/")) {
    return `openai/${value}`;
  }

  return value;
}
