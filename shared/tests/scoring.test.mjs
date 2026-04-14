import assert from "node:assert/strict";
import { calculateLocationScore, enrichLocation, estimateLocationRoi, sampleLocations } from "../src/index.js";

const enriched = enrichLocation(sampleLocations[0]);

assert.ok(calculateLocationScore(sampleLocations[0]) > 70);
assert.ok(estimateLocationRoi(sampleLocations[0], enriched.score) > 0);
assert.equal(enriched.id, "detroit-downtown-hub");
assert.equal(enriched.priority, "High");

console.log("shared scoring tests passed");
