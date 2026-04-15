# Electrification & EV Planning Agent

MVP for Walker-Miller Energy Services to plan EV charging infrastructure using location, demand, grid, adoption, ROI, and AI recommendation signals.

## Stack

- `frontend/`: Next.js, Tailwind CSS, OpenStreetMap, deployable to Vercel.
- `backend/`: Node.js Express API, deployable to Render.
- `shared/`: deterministic scoring, ROI model, sample seed data, and shared shapes.
- `docs/`: architecture notes, API contract, and Supabase schema.
- Database: Supabase Postgres. `pgvector` is intentionally not used for this MVP.
- AI: OpenAI Responses API for recommendation summaries and planning suggestions.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev:backend
npm run dev:frontend
```

Open the dashboard at:

```text
http://localhost:3000
```

The backend runs on `http://localhost:4000`. If Supabase is not configured, it uses an in-memory repository so the MVP can still be demoed locally.

## Core Features

- Upload or seed location data.
- Score locations with a deterministic formula.
- Generate AI recommendation summaries.
- Display scored locations on an OpenStreetMap map.
- Show ROI estimate per location.

## Required Table

See [docs/supabase-schema.sql](docs/supabase-schema.sql).

```text
locations:
id, name, latitude, longitude, population_density, energy_demand,
traffic_score, grid_readiness, ev_adoption_score, roi_estimate,
recommendation_summary, created_at
```

## Local Commands

```bash
npm run phase2:init
npm run phase2:check
npm run test
npm run check
npm run dev:backend
npm run dev:frontend
```

See [docs/phase-2-setup.md](docs/phase-2-setup.md) for Supabase, OpenStreetMap, and OpenAI setup.

## Deployment

Vercel:

- Project root: `frontend`
- Build command: `npm run build`
- Output: Next.js default
- Set `NEXT_PUBLIC_API_URL`; optionally set `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION`

Render:

- Use `render.yaml` from the repo root, or create a Node web service.
- Build command: `npm install`
- Start command: `npm --workspace backend run start`
- Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `FRONTEND_ORIGIN`.
