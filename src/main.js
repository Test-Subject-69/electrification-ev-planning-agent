import { evaluateCandidates } from "./application/evaluate-candidates.js";
import { generateRecommendations } from "./application/recommendation-agent.js";
import { parseLocationData } from "./infrastructure/location-data-parser.js";
import { createDashboard } from "./presentation/dashboard-view.js";

const app = document.querySelector("#app");
const dashboard = createDashboard(app, {
  onScenarioChange: render,
  onFileUpload: handleFileUpload
});

let candidates = [];

async function start() {
  try {
    const response = await fetch("/data/candidate-locations.csv");
    const csv = await response.text();
    candidates = parseLocationData(csv, "csv");
    render("balanced");
  } catch (error) {
    dashboard.renderError(getErrorMessage(error));
  }
}

function render(scenario) {
  const portfolio = evaluateCandidates(candidates, scenario);
  const recommendations = generateRecommendations(portfolio);
  dashboard.render({ portfolio, recommendations });
}

async function handleFileUpload(file, scenario) {
  try {
    const text = await file.text();
    const extension = file.name.toLowerCase().endsWith(".json") ? "json" : "csv";
    candidates = parseLocationData(text, extension);
    render(scenario);
  } catch (error) {
    dashboard.renderError(getErrorMessage(error));
  }
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unable to process the location data.";
}

start();
