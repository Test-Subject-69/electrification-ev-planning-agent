const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchLocations(accessToken = "") {
  return request("/api/locations", {}, accessToken);
}

export async function seedLocations(accessToken = "") {
  return request("/api/locations/seed", { method: "POST" }, accessToken);
}

export async function uploadLocationsCsv(csv, accessToken = "") {
  return request("/api/locations/upload", {
    method: "POST",
    body: JSON.stringify({ csv })
  }, accessToken);
}

export async function regenerateRecommendations(accessToken = "") {
  return request("/api/locations/recommendations", { method: "POST" }, accessToken);
}

export async function compareLocations(locationIds, accessToken = "") {
  return request("/api/locations/compare", {
    method: "POST",
    body: JSON.stringify({ locationIds })
  }, accessToken);
}

export async function askLocationQuestion(locationOrId, question, accessToken = "") {
  const location = getLocationSnapshot(locationOrId);
  const locationId = location?.id || locationOrId;

  return request("/api/chat/location", {
    method: "POST",
    body: JSON.stringify({
      locationId,
      question,
      ...(location ? { location } : {})
    })
  }, accessToken);
}

function getLocationSnapshot(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    latitude: value.latitude,
    longitude: value.longitude,
    population_density: value.population_density,
    energy_demand: value.energy_demand,
    traffic_score: value.traffic_score,
    grid_readiness: value.grid_readiness,
    ev_adoption_score: value.ev_adoption_score,
    roi_estimate: value.roi_estimate,
    recommendation_summary: value.recommendation_summary,
    created_at: value.created_at,
    analysis: value.analysis
  };
}

async function request(path, options = {}, accessToken = "") {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || `Request failed with ${response.status}`);
  }

  return response.json();
}
