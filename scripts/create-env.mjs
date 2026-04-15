import { copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const source = new URL("../.env.example", import.meta.url);
const target = new URL("../.env", import.meta.url);

try {
  await access(target, constants.F_OK);
  console.log(".env already exists. No changes made.");
} catch {
  await copyFile(source, target);
  console.log("Created .env from .env.example. Add Supabase, OpenAI, and Mapbox values before live Phase 2 checks.");
}
