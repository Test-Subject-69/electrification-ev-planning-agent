const REQUIRED_COLUMNS = [
  "id",
  "name",
  "city",
  "latitude",
  "longitude",
  "locationType",
  "dailyTraffic",
  "equityIndex",
  "gridCapacityKw",
  "nearbyChargers",
  "medianIncome",
  "evAdoptionScore",
  "utilityIncentive",
  "siteReadiness",
  "estimatedCapex",
  "chargerPorts"
];

const NUMERIC_COLUMNS = new Set([
  "latitude",
  "longitude",
  "dailyTraffic",
  "equityIndex",
  "gridCapacityKw",
  "nearbyChargers",
  "medianIncome",
  "evAdoptionScore",
  "utilityIncentive",
  "siteReadiness",
  "estimatedCapex",
  "chargerPorts"
]);

export function parseLocationData(rawText, fileType = "csv") {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return [];
  }

  const records = fileType === "json" || trimmed.startsWith("[")
    ? JSON.parse(trimmed)
    : parseCsv(trimmed);

  return records.map(normalizeCandidate);
}

function parseCsv(csvText) {
  const [headerLine, ...rows] = csvText.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(headerLine);

  validateColumns(headers);

  return rows.map((row) => {
    const values = splitCsvLine(row);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"" && nextCharacter === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (character === "\"") {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function validateColumns(headers) {
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
  }
}

function normalizeCandidate(record) {
  const candidate = {};

  for (const column of REQUIRED_COLUMNS) {
    const value = record[column];
    candidate[column] = NUMERIC_COLUMNS.has(column) ? Number(value) : String(value || "");
  }

  validateCandidate(candidate);
  return candidate;
}

function validateCandidate(candidate) {
  const missingText = ["id", "name", "city", "locationType"].filter((key) => !candidate[key]);
  if (missingText.length > 0) {
    throw new Error(`Candidate is missing text fields: ${missingText.join(", ")}`);
  }

  for (const key of NUMERIC_COLUMNS) {
    if (!Number.isFinite(candidate[key])) {
      throw new Error(`Candidate ${candidate.id} has invalid numeric value for ${key}`);
    }
  }
}
