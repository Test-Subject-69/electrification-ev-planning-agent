import { appendFile, copyFile, access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const source = new URL("../.env.example", import.meta.url);
const target = new URL("../.env", import.meta.url);

try {
  await access(target, constants.F_OK);
  const missingLines = await getMissingExampleLines(source, target);

  if (missingLines.length === 0) {
    console.log(".env already exists and has all current keys. No changes made.");
  } else {
    await appendFile(target, `\n# Added by Phase 2 setup\n${missingLines.join("\n")}\n`);
    console.log(`.env already exists. Added ${missingLines.length} missing key(s) from .env.example.`);
  }
} catch {
  await copyFile(source, target);
  console.log("Created .env from .env.example. Add Supabase and OpenAI values before live Phase 2 checks.");
}

async function getMissingExampleLines(exampleUrl, envUrl) {
  const [exampleText, envText] = await Promise.all([
    readFile(exampleUrl, "utf8"),
    readFile(envUrl, "utf8")
  ]);
  const existingKeys = new Set(getKeys(envText));

  return exampleText
    .split(/\r?\n/)
    .filter((line) => {
      const key = getKey(line);
      return key && !existingKeys.has(key);
    });
}

function getKeys(text) {
  return text
    .split(/\r?\n/)
    .map(getKey)
    .filter(Boolean);
}

function getKey(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
    return "";
  }

  return trimmed.slice(0, trimmed.indexOf("=")).trim();
}
