export function parseLocationsCsv(csvText) {
  const rows = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) {
    return [];
  }

  const headers = splitCsvLine(rows[0]);

  return rows.slice(1).map((row) => {
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
