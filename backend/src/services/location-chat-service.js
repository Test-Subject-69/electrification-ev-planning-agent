import { analyzeLocations, enrichLocation } from "@ev-planning/shared";
import { AiTextService } from "./ai-text-service.js";

const SOURCES = ["Selected location metrics", "Scoring model", "Portfolio comparison"];
const AVAILABLE_DATA_SOURCES = ["Available location dataset"];
const RAG_SCOPE_MESSAGE =
  "I can only answer questions about the selected location using the data loaded in this system: score, rank, ROI estimate, population density, energy demand, traffic score, grid readiness, EV adoption score, strengths, risks, and next steps. Ask a planning question like \"Why is this area good?\" or \"What are the risks?\"";

export class LocationChatService {
  constructor({ repository }) {
    this.repository = repository;
    this.ai = new AiTextService();
    this.mode = this.ai.mode;
  }

  async explainLocation({ locationId, question, locationSnapshot = null }) {
    const storedLocations = analyzeLocations(await this.repository.list());
    const snapshotLocation = normalizeLocationSnapshot(locationSnapshot);
    const initialLocation = findLocation(storedLocations, locationId) || getMatchingSnapshot(snapshotLocation, locationId);

    if (!initialLocation) {
      return null;
    }

    const locations = analyzeLocations(includeSelectedLocation(storedLocations, initialLocation));
    const location = findLocation(locations, initialLocation.id) || initialLocation;
    const portfolio = buildPortfolioContext(locations, location);
    const safeQuestion = normalizeQuestion(question);
    const scopeCheck = checkQuestionScope(safeQuestion);

    if (!scopeCheck.isRelevant) {
      return {
        answer: RAG_SCOPE_MESSAGE,
        sources: AVAILABLE_DATA_SOURCES,
        generated_by: "rag_guardrail",
        recommended_follow_up: "Which metrics can I ask about?"
      };
    }

    const unavailableTopic = getUnavailableDataTopic(safeQuestion);
    if (unavailableTopic) {
      return {
        answer: buildUnavailableDataAnswer(location, unavailableTopic),
        sources: AVAILABLE_DATA_SOURCES,
        generated_by: "rag_guardrail",
        recommended_follow_up: "What should we validate next?"
      };
    }

    const answer = await this.ai.generateText({
      instructions: [
          "You are an executive EV infrastructure planning assistant for Walker-Miller Energy Services.",
          "Use only the supplied selected-location metrics, scoring model values, and portfolio comparisons.",
          "Do not invent real utility capacity, ownership, incentive, charger count, construction, or demographic facts.",
          "If the user's question cannot be answered from the supplied context, say the current dataset does not include that information and name the available metrics.",
          "Do not answer random, test, or off-topic inputs with a generic location explanation.",
          "Directly answer the user's question. If they ask about risks, focus on risks and constraints. If they ask what to do next, focus on actions. If they ask why the site is good, focus on strengths.",
          "Return a concise executive brief using this exact readable structure with line breaks. Do not combine the sections into one paragraph:",
          "Overview: one sentence that directly answers the question.",
          "Key factors:",
          "- two to three bullets with the strongest supporting metrics.",
          "Risks:",
          "- one to two bullets using only available risk flags or scoring constraints.",
          "Recommended next step: one clear action sentence.",
          "Keep each section short and do not use markdown tables."
        ].join(" "),
      input: buildPrompt(location, portfolio, safeQuestion),
      maxTokens: 360
    });
    const recommendedFollowUp = await generateRecommendedFollowUp({
      ai: this.ai,
      location,
      portfolio,
      question: safeQuestion,
      answer
    });

    return {
      answer,
      sources: SOURCES,
      generated_by: "ai",
      recommended_follow_up: recommendedFollowUp.question,
      follow_up_generated_by: recommendedFollowUp.generatedBy
    };
  }
}

function buildPrompt(location, portfolio, question) {
  return [
    `Question: ${question}`,
    "",
    "Selected location:",
    `Name: ${location.name}`,
    `Priority: ${location.priority}`,
    `Rank: ${portfolio.rank} of ${portfolio.totalLocations}`,
    `Score: ${location.score}`,
    `ROI estimate: ${location.roi_estimate}%`,
    `Population density: ${location.population_density}`,
    `Energy demand: ${location.energy_demand}`,
    `Traffic score: ${location.traffic_score}`,
    `Grid readiness: ${location.grid_readiness}`,
    `EV adoption score: ${location.ev_adoption_score}`,
    "",
    "Portfolio averages:",
    `Average score: ${portfolio.averages.score}`,
    `Average ROI estimate: ${portfolio.averages.roi_estimate}%`,
    `Average population density: ${portfolio.averages.population_density}`,
    `Average energy demand: ${portfolio.averages.energy_demand}`,
    `Average traffic score: ${portfolio.averages.traffic_score}`,
    `Average grid readiness: ${portfolio.averages.grid_readiness}`,
    `Average EV adoption score: ${portfolio.averages.ev_adoption_score}`,
    "",
    "Scoring model weights:",
    "Energy demand 24%, traffic 22%, grid readiness 20%, population density 18%, EV adoption 16%.",
    "",
    "Score breakdown:",
    ...(location.analysis?.score_breakdown || []).map((factor) => {
      return `${factor.label}: raw ${factor.raw_value}, normalized ${factor.normalized_score}, contribution ${factor.contribution}`;
    }),
    "",
    "Strengths:",
    ...formatAnalysisList(location.analysis?.strengths, "No portfolio strengths flagged."),
    "",
    "Risk flags:",
    ...formatAnalysisList(location.analysis?.risk_flags, "No major scoring risk flagged."),
    "",
    "Recommended next steps:",
    ...formatTextList(location.analysis?.next_steps, "Confirm site feasibility before committing capital.")
  ].join("\n");
}

function checkQuestionScope(question) {
  const value = String(question || "").trim().toLowerCase();
  const compact = value.replace(/[^a-z0-9]/g, "");

  if (!compact) {
    return { isRelevant: true };
  }

  const randomInputs = new Set([
    "test",
    "testing",
    "asdf",
    "qwerty",
    "hello",
    "hi",
    "hey",
    "ok",
    "okay",
    "thanks",
    "thankyou"
  ]);

  if (randomInputs.has(compact)) {
    return { isRelevant: false };
  }

  const planningPatterns = [
    /\bareas?\b/,
    /\baverages?\b/,
    /\bcandidates?\b/,
    /\bcharging\b/,
    /\bchargers?\b/,
    /\bcompare\b/,
    /\bconstraints?\b/,
    /\bdemand\b/,
    /\bdensity\b/,
    /\bev\b/,
    /\bexplain\b/,
    /\bfeasibility\b/,
    /\bfunding\b/,
    /\bgood\b/,
    /\bgrid\b/,
    /\binvestments?\b/,
    /\blocations?\b/,
    /\bmetrics?\b/,
    /\bnext\b/,
    /\bplanning\b/,
    /\bpopulation\b/,
    /\bportfolio\b/,
    /\bpriorit(y|ies)\b/,
    /\branks?\b/,
    /\breadiness\b/,
    /\brecommend(ed|ation|ations)?\b/,
    /\broi\b/,
    /\brisks?\b/,
    /\bscores?\b/,
    /\bsites?\b/,
    /\bsteps?\b/,
    /\bstrengths?\b/,
    /\btraffic\b/,
    /\butility\b/,
    /\bweak(ness|nesses)?\b/
  ];

  return {
    isRelevant: planningPatterns.some((pattern) => pattern.test(value))
  };
}

function getUnavailableDataTopic(question) {
  const value = String(question || "").toLowerCase();
  const unavailableTopics = [
    { topic: "utility capacity", pattern: /\b(capacity|transformer|substation|feeder|interconnection)\b/ },
    { topic: "land ownership or site control status", pattern: /\b(owner|ownership|landowner|site control|parcel|lease)\b/ },
    { topic: "incentives or grant awards", pattern: /\b(incentive|rebate|grant|tax credit|award)\b/ },
    { topic: "charger count or charger type", pattern: /\b(how many chargers|number of chargers|charger count|level 2|dc fast|dcfc|charger type)\b/ },
    { topic: "exact construction or installation cost", pattern: /\b(exact cost|construction cost|installation cost|capex|budget)\b/ },
    { topic: "permitting status", pattern: /\b(permit|permitting|zoning|inspection)\b/ },
    { topic: "street address or parcel details", pattern: /\b(address|parcel|lot number)\b/ }
  ];

  return unavailableTopics.find((item) => item.pattern.test(value))?.topic || "";
}

function buildUnavailableDataAnswer(location, topic) {
  return [
    `Overview: The current dataset does not include ${topic} for ${location.name}.`,
    "Key factors:",
    "- Available fields include score, rank, ROI estimate, population density, energy demand, traffic score, grid readiness, EV adoption score, strengths, risks, and next steps.",
    "- The answer must stay within those loaded planning metrics.",
    "Risks:",
    "- This missing item should not be assumed or presented as confirmed.",
    "Recommended next step: Validate this missing item during site feasibility review before committing capital."
  ].join("\n");
}

async function generateRecommendedFollowUp({ ai, location, portfolio, question, answer }) {
  const fallback = getFallbackFollowUp(location, portfolio, question);

  try {
    const aiQuestion = await ai.generateText({
      instructions: [
        "Generate one useful follow-up question for an EV infrastructure planning chatbot.",
        "Use only the supplied selected-location data and answer context.",
        "The question must be answerable from these available fields only: score, rank, ROI estimate, population density, energy demand, traffic score, grid readiness, EV adoption score, score breakdown, strengths, risks, next steps, and portfolio averages.",
        "Do not ask about unavailable facts such as exact utility capacity, ownership, incentives, charger count, permitting, construction cost, addresses, or parcel details.",
        "Do not repeat the user's question.",
        "Avoid these generic questions unless no better option exists: Why is this area good? What are the risks? What should we do next?",
        "Return only the follow-up question. Keep it under 14 words."
      ].join(" "),
      input: buildFollowUpPrompt(location, portfolio, question, answer),
      maxTokens: 40
    });
    return {
      question: sanitizeFollowUpQuestion(aiQuestion, fallback, question),
      generatedBy: "ai"
    };
  } catch {
    return {
      question: fallback,
      generatedBy: "deterministic_fallback"
    };
  }
}

function buildFollowUpPrompt(location, portfolio, question, answer) {
  return [
    `User question: ${question}`,
    `Assistant answer: ${answer}`,
    "",
    "Selected location data:",
    `Name: ${location.name}`,
    `Priority: ${location.priority}`,
    `Rank: ${portfolio.rank} of ${portfolio.totalLocations}`,
    `Score: ${location.score}`,
    `ROI estimate: ${location.roi_estimate}%`,
    `Population density: ${location.population_density}`,
    `Energy demand: ${location.energy_demand}`,
    `Traffic score: ${location.traffic_score}`,
    `Grid readiness: ${location.grid_readiness}`,
    `EV adoption score: ${location.ev_adoption_score}`,
    "",
    "Portfolio averages:",
    `Average score: ${portfolio.averages.score}`,
    `Average ROI estimate: ${portfolio.averages.roi_estimate}%`,
    `Average population density: ${portfolio.averages.population_density}`,
    `Average energy demand: ${portfolio.averages.energy_demand}`,
    `Average traffic score: ${portfolio.averages.traffic_score}`,
    `Average grid readiness: ${portfolio.averages.grid_readiness}`,
    `Average EV adoption score: ${portfolio.averages.ev_adoption_score}`,
    "",
    "Available strengths:",
    ...formatAnalysisList(location.analysis?.strengths, "No portfolio strengths flagged."),
    "",
    "Available risks:",
    ...formatAnalysisList(location.analysis?.risk_flags, "No major scoring risk flagged."),
    "",
    "Available next steps:",
    ...formatTextList(location.analysis?.next_steps, "Confirm site feasibility before committing capital.")
  ].join("\n");
}

function sanitizeFollowUpQuestion(value, fallback, previousQuestion) {
  const cleaned = String(value || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(suggested|follow-up|follow up)\s*:\s*/i, "")
    .trim();
  const question = cleaned.endsWith("?") ? cleaned : `${cleaned}?`;

  if (!isValidFollowUpQuestion(question, previousQuestion)) {
    return fallback;
  }

  return question;
}

function isValidFollowUpQuestion(question, previousQuestion) {
  const normalizedQuestion = normalizeLookupKey(question);
  const normalizedPreviousQuestion = normalizeLookupKey(previousQuestion);

  if (!normalizedQuestion || normalizedQuestion === normalizedPreviousQuestion) {
    return false;
  }

  if (question.split(/\s+/).length > 16) {
    return false;
  }

  if (getUnavailableDataTopic(question)) {
    return false;
  }

  return checkQuestionScope(question).isRelevant;
}

function getFallbackFollowUp(location, portfolio, question) {
  const previousKey = normalizeLookupKey(question);
  const riskCount = location.analysis?.risk_flags?.length || 0;
  const strengthsCount = location.analysis?.strengths?.length || 0;
  const candidates = [
    riskCount ? "Which risk should we validate first?" : "",
    strengthsCount ? "Which strength matters most for deployment?" : "",
    "Which metric is driving the score?",
    "How does ROI compare with the portfolio?",
    "Is grid readiness strong enough for near-term planning?",
    "How much does traffic support this site?",
    "How does EV adoption compare with similar locations?",
    "What makes this site different from the portfolio average?",
    "Which factor would improve the ranking most?",
    location.priority === "High" ? "What makes this a high-priority site?" : "",
    portfolio.rank <= 5 ? "Why is this a top-ranked location?" : ""
  ].filter(Boolean);

  return candidates.find((candidate) => normalizeLookupKey(candidate) !== previousKey) || "Which metric should we review next?";
}

function buildFallbackAnswer(location, portfolio, question) {
  const strengths = location.analysis?.strengths?.length
    ? location.analysis.strengths.slice(0, 2).map((strength) => strength.message)
    : getStrengths(location, portfolio);
  const risks = getLocationRisks(location, portfolio);
  const nextSteps = getLocationNextSteps(location);
  const nextStep = stripTrailingPunctuation(nextSteps[0]);
  const intent = getQuestionIntent(question);

  if (intent === "risks") {
    return [
      `Overview: ${location.name} has ${risks.length} planning risk${risks.length === 1 ? "" : "s"} to review before advancing.`,
      "Key factors:",
      `- Score is ${location.score}, ROI estimate is ${location.roi_estimate}%, grid readiness is ${location.grid_readiness}%, and traffic score is ${location.traffic_score}.`,
      `- The site ranks ${portfolio.rank} of ${portfolio.totalLocations} with ${location.priority.toLowerCase()} priority.`,
      "Risks:",
      `- ${risks[0]}.`,
      "Recommended next step:",
      `- ${nextStep}.`
    ].join("\n");
  }

  if (intent === "next_steps") {
    return [
      `Overview: ${location.name} is ready for the next planning review based on its current score and priority.`,
      "Key factors:",
      `- Rank is ${portfolio.rank} of ${portfolio.totalLocations}; priority is ${location.priority}.`,
      `- Score is ${location.score}, ROI estimate is ${location.roi_estimate}%, and grid readiness is ${location.grid_readiness}%.`,
      "Risks:",
      `- ${risks[0]}.`,
      "Recommended next step:",
      ...nextSteps.map((step) => `- ${stripTrailingPunctuation(step)}.`)
    ].join("\n");
  }

  return [
    `Overview: ${location.name} is a ${location.priority.toLowerCase()}-priority EV charging candidate ranked ${portfolio.rank} of ${portfolio.totalLocations}.`,
    "Key factors:",
    ...strengths.slice(0, 3).map((strength) => `- ${strength}.`),
    `- ROI estimate is ${location.roi_estimate}% and score is ${location.score}.`,
    "Risks:",
    `- ${risks[0]}.`,
    "Recommended next step:",
    `- ${nextStep}.`
  ].join("\n");
}

function buildPortfolioContext(locations, selectedLocation) {
  return {
    rank: locations.findIndex((location) => matchesSelectedLocation(location, selectedLocation)) + 1,
    totalLocations: locations.length,
    averages: {
      score: average(locations.map((location) => location.score)),
      roi_estimate: average(locations.map((location) => location.roi_estimate)),
      population_density: average(locations.map((location) => location.population_density)),
      energy_demand: average(locations.map((location) => location.energy_demand)),
      traffic_score: average(locations.map((location) => location.traffic_score)),
      grid_readiness: average(locations.map((location) => location.grid_readiness)),
      ev_adoption_score: average(locations.map((location) => location.ev_adoption_score))
    }
  };
}

function findLocation(locations, locationId) {
  return locations.find((location) => isSameLocation(location, locationId));
}

function getMatchingSnapshot(location, locationId) {
  if (!location || !isSameLocation(location, locationId)) {
    return null;
  }

  return location;
}

function includeSelectedLocation(locations, selectedLocation) {
  const hasSelectedLocation = locations.some((location) => matchesSelectedLocation(location, selectedLocation));

  if (hasSelectedLocation) {
    return locations;
  }

  return [...locations, selectedLocation].sort(sortByScore);
}

function normalizeLocationSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return enrichLocation(value);
}

function matchesSelectedLocation(location, selectedLocation) {
  return isSameLocation(location, selectedLocation.id) || isSameLocation(location, selectedLocation.name);
}

function isSameLocation(location, locationId) {
  const lookupKey = normalizeLookupKey(locationId);

  if (!lookupKey) {
    return false;
  }

  return [location.id, location.name].some((value) => normalizeLookupKey(value) === lookupKey);
}

function getStrengths(location, portfolio) {
  const factors = [
    {
      label: `energy demand is ${compareToAverage(location.energy_demand, portfolio.averages.energy_demand)} the portfolio average`,
      value: location.energy_demand
    },
    {
      label: `traffic score is ${compareToAverage(location.traffic_score, portfolio.averages.traffic_score)} the portfolio average`,
      value: location.traffic_score
    },
    {
      label: `grid readiness is ${compareToAverage(location.grid_readiness, portfolio.averages.grid_readiness)} the portfolio average`,
      value: location.grid_readiness
    },
    {
      label: `ROI estimate is ${compareToAverage(location.roi_estimate, portfolio.averages.roi_estimate)} the portfolio average`,
      value: location.roi_estimate
    },
    {
      label: `EV adoption score is ${compareToAverage(location.ev_adoption_score, portfolio.averages.ev_adoption_score)} the portfolio average`,
      value: location.ev_adoption_score
    }
  ];

  return factors
    .sort((left, right) => right.value - left.value)
    .slice(0, 2)
    .map((factor) => factor.label);
}

function getRisk(location) {
  const factors = [
    { label: "grid readiness", value: location.grid_readiness },
    { label: "EV adoption", value: location.ev_adoption_score },
    { label: "traffic", value: location.traffic_score },
    { label: "energy demand", value: location.energy_demand }
  ].sort((left, right) => left.value - right.value);

  const weakest = factors[0];
  if (weakest.value >= 75) {
    return "confirming utility coordination, site control, and final installation cost before committing capital";
  }

  return `${weakest.label} is the weakest signal and should be validated before deployment`;
}

function getNextStep(location) {
  if (location.priority === "High") {
    return "advance utility coordination, site feasibility, and funding review for near-term deployment";
  }

  if (location.priority === "Medium") {
    return "keep the site in the planning pipeline while validating costs, ownership, and demand assumptions";
  }

  return "monitor the site and revisit when demand, adoption, or grid readiness improves";
}

function getLocationRisks(location, portfolio) {
  const risks = location.analysis?.risk_flags?.map((risk) => risk.message).filter(Boolean) || [];

  if (risks.length) {
    return risks;
  }

  return [getRisk(location, portfolio)];
}

function getLocationNextSteps(location) {
  const steps = location.analysis?.next_steps?.filter(Boolean) || [];

  if (steps.length) {
    return steps;
  }

  return [getNextStep(location)];
}

function getQuestionIntent(question) {
  const value = normalizeLookupKey(question);

  if (/\b(risk|risks|constraint|constraints|concern|concerns|weak|weakness|downside|problem|issue)\b/.test(value)) {
    return "risks";
  }

  if (/\b(next|step|steps|action|actions|do|recommend|recommendation|proceed|validate|plan)\b/.test(value)) {
    return "next_steps";
  }

  return "strengths";
}

function compareToAverage(value, averageValue) {
  if (value >= averageValue + 5) {
    return "above";
  }

  if (value <= averageValue - 5) {
    return "below";
  }

  return "near";
}

function normalizeQuestion(question) {
  const value = String(question || "").trim();
  return value || "Why is this area a good candidate for EV charging?";
}

function formatAnalysisList(items, fallback) {
  if (!Array.isArray(items) || !items.length) {
    return [fallback];
  }

  return items.map((item) => item.message || String(item));
}

function formatTextList(items, fallback) {
  if (!Array.isArray(items) || !items.length) {
    return [fallback];
  }

  return items.map(String);
}

function normalizeLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stripTrailingPunctuation(value) {
  return String(value || "").trim().replace(/[.!?]+$/g, "");
}

function average(values) {
  const validValues = values.map(Number).filter(Number.isFinite);
  if (!validValues.length) {
    return 0;
  }

  return Math.round((validValues.reduce((sum, value) => sum + value, 0) / validValues.length) * 10) / 10;
}

function sortByScore(left, right) {
  return right.score - left.score;
}
