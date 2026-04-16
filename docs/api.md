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

Returns scored locations.

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

Regenerates recommendation summaries for stored locations.
