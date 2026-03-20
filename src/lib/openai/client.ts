import "@/lib/openai/node-file-polyfill";
import OpenAI from "openai";

export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey: key });
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
