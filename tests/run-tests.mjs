import assert from "node:assert/strict";
import { scoreCandidate, SCENARIO_WEIGHTS } from "../src/domain/scoring-model.js";
import { estimateRoi } from "../src/domain/roi-model.js";
import { parseLocationData } from "../src/infrastructure/location-data-parser.js";

const tests = [
  ["parses CSV candidate locations", testCsvParsing],
  ["rejects missing required columns", testMissingColumns],
  ["scores a candidate with explainable components", testScoring],
  ["estimates ROI from candidate economics", testRoi]
];

for (const [name, test] of tests) {
  test();
  console.log(`passed: ${name}`);
}

function testCsvParsing() {
  const csv = [
    "id,name,city,latitude,longitude,locationType,dailyTraffic,equityIndex,gridCapacityKw,nearbyChargers,medianIncome,evAdoptionScore,utilityIncentive,siteReadiness,estimatedCapex,chargerPorts",
    "a-1,Depot,Detroit,42.3,-83.1,Fleet,12000,80,500,1,45000,60,70,75,300000,6"
  ].join("\n");

  const [candidate] = parseLocationData(csv, "csv");

  assert.equal(candidate.name, "Depot");
  assert.equal(candidate.dailyTraffic, 12000);
  assert.equal(candidate.chargerPorts, 6);
}

function testMissingColumns() {
  assert.throws(() => parseLocationData("id,name\n1,Site", "csv"), /Missing required columns/);
}

function testScoring() {
  const score = scoreCandidate(createCandidate(), SCENARIO_WEIGHTS.balanced);

  assert.ok(score.totalScore > 70);
  assert.equal(score.drivers.length, 3);
  assert.ok(score.components.grid > 0);
}

function testRoi() {
  const candidate = createCandidate();
  const score = scoreCandidate(candidate, SCENARIO_WEIGHTS.balanced);
  const roi = estimateRoi(candidate, score.totalScore);

  assert.ok(roi.annualNetRevenue > 0);
  assert.ok(roi.netCapex < candidate.estimatedCapex);
  assert.ok(roi.paybackYears > 0);
}

function createCandidate() {
  return {
    id: "site-1",
    name: "Priority Site",
    city: "Detroit",
    latitude: 42.33,
    longitude: -83.05,
    locationType: "Transit hub",
    dailyTraffic: 38000,
    equityIndex: 86,
    gridCapacityKw: 700,
    nearbyChargers: 1,
    medianIncome: 43000,
    evAdoptionScore: 72,
    utilityIncentive: 80,
    siteReadiness: 84,
    estimatedCapex: 420000,
    chargerPorts: 8
  };
}
