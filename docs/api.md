# API Contract

Base URL:

```text
http://localhost:4000
```

## `GET /health`

Returns API health and repository mode.

## Authentication

When Supabase auth is required, location endpoints expect the logged-in user's access token:

```text
Authorization: Bearer <supabase_access_token>
```

## `GET /api/locations`

Returns scored locations with deterministic planning analysis:

```json
{
  "locations": [
    {
      "id": "riverfront-visitor-lot",
      "score": 70,
      "priority": "Medium",
      "analysis": {
        "rank": 3,
        "score_breakdown": [],
        "portfolio_comparison": {},
        "strengths": [],
        "risk_flags": [],
        "next_steps": [],
        "recommendation_brief": "..."
      }
    }
  ]
}
```

## `POST /api/locations/seed`

Adds or updates the default Walker-Miller demo locations, calculates scores and ROI, generates recommendation summaries, and stores them without removing uploaded locations.

## `POST /api/locations/upload`

Accepts one of:

```json
{ "locations": [] }
```

```json
{ "csv": "name,latitude,longitude,population_density,energy_demand,traffic_score,grid_readiness,ev_adoption_score\n..." }
```

Returns the saved scored locations.

## `POST /api/locations/recommendations`

Regenerates recommendation summaries for stored locations. The backend creates a deterministic brief first, then uses OpenAI only to rewrite the verified data when configured.

## `POST /api/locations/compare`

Compares 2 to 5 selected locations using deterministic metrics, portfolio analysis, risks, and next steps.

```json
{ "locationIds": ["detroit-downtown-hub", "riverfront-visitor-lot"] }
```

Returns:

```json
{
  "selected_locations": [],
  "best_by_metric": {},
  "recommended_winner": {
    "location_id": "detroit-downtown-hub",
    "location_name": "Downtown Mobility Hub"
  },
  "summary": "..."
}
```

## `POST /api/chat/location`

Answers executive EV planning questions about a selected location using retrieved location metrics, scoring context, and portfolio comparisons.

```json
{ "locationId": "riverfront-visitor-lot", "question": "Why is this area good for EV charging?" }
```

The frontend may also include the selected location snapshot. The backend still tries stored data first, then uses the snapshot only when it matches the requested location.

Returns:

```json
{
  "answer": "...",
  "sources": ["Selected location metrics", "Scoring model", "Portfolio comparison"]
}
```
