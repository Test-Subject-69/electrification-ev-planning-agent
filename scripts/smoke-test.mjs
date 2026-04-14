import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { parseLocationData } from "../src/infrastructure/location-data-parser.js";
import { evaluateCandidates } from "../src/application/evaluate-candidates.js";
import { generateRecommendations } from "../src/application/recommendation-agent.js";

const csv = await readFile(new URL("../data/candidate-locations.csv", import.meta.url), "utf8");
const candidates = parseLocationData(csv, "csv");
const portfolio = evaluateCandidates(candidates);
const recommendations = generateRecommendations(portfolio);

assert.equal(candidates.length, 10);
assert.ok(portfolio.rankedCandidates.length > 0);
assert.ok(portfolio.metrics.totalAnnualNetRevenue > 0);
assert.ok(recommendations.length >= 3);

console.log("Smoke check passed: sample data ranks, ROI calculates, and recommendations generate.");
