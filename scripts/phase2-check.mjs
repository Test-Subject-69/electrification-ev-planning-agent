import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const env = await loadEnv();
const checks = [];
let hasFailure = false;

checks.push(checkPresence("NEXT_PUBLIC_MAP_TILE_URL", env.NEXT_PUBLIC_MAP_TILE_URL));
checks.push(checkPresence("NEXT_PUBLIC_MAP_ATTRIBUTION", env.NEXT_PUBLIC_MAP_ATTRIBUTION));
checks.push(checkPresence("Supabase URL", getSupabaseConfig(env).url, getSupabaseConfig(env).urlSource));
checks.push(checkPresence("Supabase API key", getSupabaseConfig(env).key, getSupabaseConfig(env).keySource));
checks.push(checkPresence("OPENAI_API_KEY", env.OPENAI_API_KEY));
checks.push(checkPresence("OPENAI_MODEL", env.OPENAI_MODEL));

const shouldCheckExternalServices = env.PHASE2_CHECK_EXTERNAL_SERVICES === "true";

if (shouldCheckExternalServices) {
  checks.push(await checkSupabase(env));
  checks.push(await checkOpenAi(env));
  checks.push(await checkOpenStreetMap(env));
} else {
  checks.push({
    name: "External service calls",
    status: "skipped",
    detail: "Set PHASE2_CHECK_EXTERNAL_SERVICES=true to verify live credentials."
  });
}

for (const check of checks) {
  const icon = check.status === "pass" ? "PASS" : check.status === "fail" ? "FAIL" : "INFO";
  console.log(`${icon} ${check.name}: ${check.detail}`);
  if (check.status === "fail") {
    hasFailure = true;
  }
}

if (hasFailure) {
  process.exitCode = 1;
}

async function loadEnv() {
  const envFile = new URL("../.env", import.meta.url);
  const exampleFile = new URL("../.env.example", import.meta.url);
  const values = { ...process.env };

  const fileToRead = await exists(envFile) ? envFile : exampleFile;
  const text = await readFile(fileToRead, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    values[key] = values[key] || stripQuotes(rawValue);
  }

  return values;
}

function checkPresence(name, value, source = "") {
  return {
    name,
    status: value ? "pass" : "skipped",
    detail: value ? `configured${source ? ` via ${source}` : ""}` : "not configured yet"
  };
}

async function checkSupabase(env) {
  const config = getSupabaseConfig(env);

  if (!config.url || !config.key) {
    return {
      name: "Supabase locations table",
      status: "skipped",
      detail:
        "Supabase URL and API key are required. Use SUPABASE_SERVICE_ROLE_KEY for production, or the publishable key for MVP mode."
    };
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/locations?select=id&limit=1`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`
      }
    });

    if (response.ok) {
      return {
        name: "Supabase locations table",
        status: "pass",
        detail: "reachable"
      };
    }

    return {
      name: "Supabase locations table",
      status: "fail",
      detail: `returned HTTP ${response.status}. Confirm docs/supabase-schema.sql was run.`
    };
  } catch (error) {
    return {
      name: "Supabase locations table",
      status: "fail",
      detail: getErrorMessage(error)
    };
  }
}

function getSupabaseConfig(env) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: env.SUPABASE_URL,
      key: env.SUPABASE_SERVICE_ROLE_KEY,
      urlSource: "SUPABASE_URL",
      keySource: "SUPABASE_SERVICE_ROLE_KEY"
    };
  }

  if (env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY) {
    return {
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
      urlSource: "SUPABASE_URL",
      keySource: "SUPABASE_PUBLISHABLE_KEY"
    };
  }

  return {
    url: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "",
    key: env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    urlSource: env.SUPABASE_URL ? "SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_URL",
    keySource: env.SUPABASE_PUBLISHABLE_KEY
      ? "SUPABASE_PUBLISHABLE_KEY"
      : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  };
}

async function checkOpenAi(env) {
  if (!env.OPENAI_API_KEY) {
    return {
      name: "OpenAI model access",
      status: "skipped",
      detail: "OPENAI_API_KEY is required."
    };
  }

  try {
    const model = env.OPENAI_MODEL || "gpt-4.1-mini";
    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      }
    });

    return {
      name: "OpenAI model access",
      status: response.ok ? "pass" : "fail",
      detail: response.ok ? `${model} is reachable` : `returned HTTP ${response.status}`
    };
  } catch (error) {
    return {
      name: "OpenAI model access",
      status: "fail",
      detail: getErrorMessage(error)
    };
  }
}

async function checkOpenStreetMap(env) {
  if (!env.NEXT_PUBLIC_MAP_TILE_URL) {
    return {
      name: "OpenStreetMap tile access",
      status: "skipped",
      detail: "NEXT_PUBLIC_MAP_TILE_URL is required."
    };
  }

  try {
    const tileUrl = env.NEXT_PUBLIC_MAP_TILE_URL
      .replace("{z}", "0")
      .replace("{x}", "0")
      .replace("{y}", "0");
    const response = await fetch(tileUrl);

    return {
      name: "OpenStreetMap tile access",
      status: response.ok ? "pass" : "fail",
      detail: response.ok ? "can load tile 0/0/0" : `returned HTTP ${response.status}`
    };
  } catch (error) {
    return {
      name: "OpenStreetMap tile access",
      status: "fail",
      detail: getErrorMessage(error)
    };
  }
}

async function exists(fileUrl) {
  try {
    await access(fileUrl, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "unknown error";
}
