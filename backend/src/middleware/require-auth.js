import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseConfig } from "../config/env.js";

let authClient;

export function requireSupabaseAuth(request, response, next) {
  if (!env.supabaseAuthRequired) {
    next();
    return;
  }

  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    response.status(401).json({ error: "Login required." });
    return;
  }

  const client = getAuthClient(response);
  if (!client) {
    return;
  }

  client.auth.getUser(token)
    .then(({ data, error }) => {
      if (error || !data.user) {
        response.status(401).json({ error: "Invalid or expired login." });
        return;
      }

      request.user = data.user;
      next();
    })
    .catch(() => {
      response.status(401).json({ error: "Unable to verify login." });
    });
}

function getAuthClient(response) {
  if (!hasSupabaseConfig()) {
    response.status(503).json({ error: "Supabase auth is not configured." });
    return null;
  }

  if (!authClient) {
    authClient = createClient(env.supabaseUrl, env.supabaseKey, {
      auth: { persistSession: false }
    });
  }

  return authClient;
}

function getBearerToken(authorizationHeader = "") {
  const [scheme, token] = String(authorizationHeader).split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
}
