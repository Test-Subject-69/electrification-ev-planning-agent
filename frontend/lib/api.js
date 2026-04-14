const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchLocations() {
  return request("/api/locations");
}

export async function seedLocations() {
  return request("/api/locations/seed", { method: "POST" });
}

export async function uploadLocationsCsv(csv) {
  return request("/api/locations/upload", {
    method: "POST",
    body: JSON.stringify({ csv })
  });
}

export async function regenerateRecommendations() {
  return request("/api/locations/recommendations", { method: "POST" });
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
