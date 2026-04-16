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
