# Architecture

The MVP uses a split deployment model:

- `frontend/` deploys to Vercel as a Next.js application.
- `backend/` deploys to Render as an Express API.
- `shared/` holds deterministic business rules used by both sides.
- Supabase Postgres stores locations.
- OpenAI generates recommendation summaries after deterministic scoring.

## Flow

1. A user seeds sample data or uploads CSV/JSON in the dashboard.
2. The frontend sends data to the backend.
3. The backend normalizes rows, calculates score and ROI, asks OpenAI for summaries when configured, and persists records.
4. The frontend reads scored locations and displays them on an OpenStreetMap map and table.

## MVP Boundaries

- `pgvector` is not used.
- AI is limited to summaries and planning suggestions, not scoring.
- Scoring and ROI are deterministic for auditability.
- If Supabase or OpenAI environment variables are missing, local fallbacks keep demos working.
