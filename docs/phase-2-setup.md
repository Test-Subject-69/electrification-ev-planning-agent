# Phase 2 Setup

Phase 2 connects the MVP to real services while keeping the app demoable if credentials are missing.

## Services

- Supabase Postgres stores locations.
- Mapbox renders the live map.
- OpenAI generates recommendation summaries.

## Steps

1. Create local environment file.

   ```bash
   npm run phase2:init
   ```

2. Fill in `.env`.

   ```text
   NEXT_PUBLIC_MAPBOX_TOKEN=
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   OPENAI_API_KEY=
   OPENAI_MODEL=gpt-4.1-mini
   ```

3. In Supabase, open SQL Editor and run:

   ```text
   docs/supabase-schema.sql
   ```

4. Run a local readiness check.

   ```bash
   npm run phase2:check
   ```

5. To verify live service credentials, set this in `.env`.

   ```text
   PHASE2_CHECK_EXTERNAL_SERVICES=true
   ```

   Then rerun:

   ```bash
   npm run phase2:check
   ```

6. Start the app.

   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

## Expected Status

Without credentials:

- Backend uses in-memory storage.
- Recommendations use deterministic fallback copy.
- Frontend shows that a Mapbox token is needed.

With credentials:

- Backend persists locations to Supabase.
- OpenAI writes recommendation summaries.
- Mapbox displays locations on the live map.

## Quick Smoke Test

After the backend starts:

```text
GET http://localhost:4000/health
GET http://localhost:4000/api/setup/status
POST http://localhost:4000/api/locations/seed
```
