# Electrification & EV Planning Agent

MVP dashboard for Walker-Miller Energy Services to evaluate EV charger sites, estimate ROI, and prepare executive-ready rollout recommendations.

## What It Does

- Ingests candidate location data from CSV or JSON.
- Scores sites using demand, equity, grid readiness, charging gap, adoption, and incentives.
- Estimates utilization, annual net revenue, payback, and ROI.
- Generates planning recommendations from the ranked portfolio.
- Visualizes candidate locations in a map-based dashboard.

## Quick Start

```bash
npm run dev
```

Then open:

```text
http://localhost:4173
```

No package install is required for the MVP because it uses browser modules and Node's built-in HTTP server.

## Project Structure

```text
data/                         Sample candidate-location inputs
docs/                         Architecture and operating notes
public/                       Browser entry point
scripts/                      Local dev server and smoke checks
src/application/              Use cases and workflow orchestration
src/domain/                   Scoring, ROI, and business rules
src/infrastructure/           Data parsing and external adapter boundaries
src/presentation/             Dashboard rendering and UI state
tests/                        Node test runner coverage
```

## Data Columns

The default CSV format is:

```text
id,name,city,latitude,longitude,locationType,dailyTraffic,equityIndex,gridCapacityKw,nearbyChargers,medianIncome,evAdoptionScore,utilityIncentive,siteReadiness,estimatedCapex,chargerPorts
```

All score-oriented fields use a `0-100` scale unless the column name includes a unit.

## Environment Variables

Copy `.env.example` to `.env` before connecting live services.

Secrets such as `OPENAI_API_KEY` must stay server-side. The current MVP uses a local recommendation engine so the dashboard can run without external services. A future API adapter can read these variables from a backend route or server process.

## Validation

```bash
npm test
npm run check
```

`npm run check` runs the test suite and a smoke check against the sample data.
