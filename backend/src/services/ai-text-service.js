import OpenAI from "openai";
import { env } from "../config/env.js";

export class AiTextService {
  constructor() {
    this.mode = env.openaiApiKey ? "ai" : "not-configured";
    this.client = env.openaiApiKey ? createClient() : null;
  }

  get isConfigured() {
    return Boolean(this.client);
  }

  async generateText({ instructions, input, maxTokens = 260 }) {
    if (!this.client) {
      throw new Error("AI generation is not configured. Add OPENAI_API_KEY and restart the backend.");
    }

    try {
      const response = await this.client.chat.completions.create({
        model: env.openaiModel,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input }
        ],
        max_tokens: maxTokens,
        temperature: 0.35
      });
      const answer = response.choices?.[0]?.message?.content;

      if (!answer) {
        throw new Error("AI provider returned an empty response.");
      }

      return normalizeText(answer);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown AI provider error.";
      throw new Error(`AI generation failed. Check OPENAI_API_KEY, OPENAI_BASE_URL, and OPENAI_MODEL. Provider said: ${detail}`);
    }
  }
}

function createClient() {
  return new OpenAI({
    apiKey: env.openaiApiKey,
    ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {})
  });
}

function normalizeText(value) {
  return String(value)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .filter(Boolean)
    .join("\n");
}
