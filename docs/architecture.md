# Architecture

The MVP separates business rules from UI rendering so scoring, ROI, and recommendation logic can move behind an API later without rewriting the dashboard.

## Layers

`src/domain`

Pure business logic. These modules know nothing about the browser, files, or future APIs.

- `scoring-model.js`: weighted candidate scoring.
- `roi-model.js`: utilization, revenue, payback, and ROI estimates.

`src/application`

Use cases that coordinate domain logic.

- `evaluate-candidates.js`: ranks sites and builds portfolio metrics.
- `recommendation-agent.js`: turns the ranked portfolio into executive actions.

`src/infrastructure`

Input/output boundaries.

- `location-data-parser.js`: parses CSV and JSON uploads into normalized candidate objects.
- Future adapters can connect GIS, utility hosting capacity, CRM, grant, or LLM services.

`src/presentation`

Browser rendering.

- `dashboard-view.js`: UI events, filters, site selection, map pins, tables, and panels.

## AI Strategy

The MVP uses a local recommendation agent to keep demos reliable. Production should add a server-side adapter that:

1. Reads `OPENAI_API_KEY` or another provider secret from environment variables.
2. Sends only non-sensitive planning context to the model.
3. Stores prompts, model version, and recommendation rationale for auditability.
4. Falls back to the local recommendation agent when the provider is unavailable.

## Data Expansion Path

Recommended next sources:

- Utility hosting capacity and feeder constraints.
- DC fast charger and Level 2 competitor inventory.
- Census and Justice40-style equity indicators.
- Fleet depot, municipal, and workplace dwell-time data.
- Grant eligibility and incentive program windows.

## Decision Model

Candidate priority is intentionally explainable. The default model balances:

- Demand potential.
- Equity and charging access gaps.
- Grid readiness.
- EV adoption signals.
- Site readiness.
- Utility incentives.

The scenario selector changes weights without hiding the math.
