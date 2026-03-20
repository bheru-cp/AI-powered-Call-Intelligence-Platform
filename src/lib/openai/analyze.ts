import { APIError } from "openai";
import { getOpenAI } from "@/lib/openai/client";
import { formatOpenAIError } from "@/lib/openai/format-error";
import { SALES_QUESTIONS } from "@/lib/constants/questionnaire";
import { mergeQuestionnaire } from "@/lib/analysis/merge-questionnaire";
import {
  analysisResultSchema,
  type AnalysisResult,
} from "@/lib/schemas/analysis";
import { z } from "zod";

const rawQuestionnaireRow = z.object({
  questionId: z.string(),
  asked: z.boolean(),
});

const gptPayloadSchema = analysisResultSchema.omit({ questionnaire: true }).extend({
  questionnaire: z.array(rawQuestionnaireRow).optional(),
});

/** Chat Completions + `response_format: json_object` — use GPT-4o family, not o-series reasoning models. */
const DEFAULT_ANALYSIS_MODEL = "gpt-4o-mini";

function resolveAnalysisModel(): string {
  let raw = (process.env.OPENAI_ANALYSIS_MODEL ?? "").replace(/\r/g, "").trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  if (!raw) {
    return DEFAULT_ANALYSIS_MODEL;
  }
  if (/^o\d/i.test(raw)) {
    throw new Error(
      `OPENAI_ANALYSIS_MODEL=${raw} is not compatible with this JSON analysis endpoint (chat.completions). Remove it or set OPENAI_ANALYSIS_MODEL=${DEFAULT_ANALYSIS_MODEL} or gpt-4o.`,
    );
  }
  return raw;
}

export async function analyzeTranscript(transcript: string): Promise<AnalysisResult> {
  const openai = getOpenAI();
  const model = resolveAnalysisModel();

  const questionBlock = SALES_QUESTIONS.map(
    (q) => `${q.id}: ${q.salesQuestion}`,
  ).join("\n");

  const system = `You are an expert sales QA analyst. Given a call transcript, output a single JSON object only (no markdown) with this exact shape and keys in camelCase:
{
  "summary": string (purpose, main topics, outcome),
  "callSentiment": "positive" | "neutral" | "negative",
  "agentTalkPct": number 0-100 (estimate agent vs customer talk time),
  "customerTalkPct": number 0-100 (should sum to ~100 with agentTalkPct),
  "overallScore": number 0-10 (sentiment, professionalism, quality),
  "performance": {
    "communicationClarity": { "score": 0-10, "rationale": string },
    "politeness": { "score": 0-10, "rationale": string },
    "businessKnowledge": { "score": 0-10, "rationale": string },
    "problemHandling": { "score": 0-10, "rationale": string },
    "listeningAbility": { "score": 0-10, "rationale": string }
  },
  "questionnaire": [ { "questionId": "Q1"|...|"Q15", "asked": boolean } ],
  "topKeywords": [ { "label": string, "emoji"?: string, "count"?: number } ],
  "actionItems": string[] (commitments and next steps),
  "positiveObservations": string[],
  "negativeObservations": string[]
}

Rules:
- Mark questionnaire "asked" true only if the topic was clearly asked or explicitly addressed in substance, not just small talk.
- Include every question id Q1 through Q15 in questionnaire (you may omit missing ids; the server will default them to false).
- topKeywords: 3-8 concise topic labels relevant to the conversation (e.g. Budget, Cabinet Style).
- Be factual; if unknown, use conservative estimates and state limitations in rationales.`;

  const user = `Transcript:\n"""${transcript.slice(0, 120_000)}"""\n\nDiscovery question reference:\n${questionBlock}`;

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
  } catch (err) {
    const base = formatOpenAIError(err);
    const isModelProblem =
      err instanceof APIError &&
      (err.status === 400 || err.status === 404) &&
      /model|does not exist|invalid/i.test(err.message);
    const hint = isModelProblem
      ? ` Set OPENAI_ANALYSIS_MODEL=${DEFAULT_ANALYSIS_MODEL} (or gpt-4o) in .env.local and restart.`
      : "";
    throw new Error(`${base}${hint}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty analysis response from model");
  }

  let json: unknown;
  try {
    json = JSON.parse(content) as unknown;
  } catch {
    throw new Error("Model returned non-JSON content");
  }

  let payload: z.infer<typeof gptPayloadSchema>;
  try {
    payload = gptPayloadSchema.parse(json);
  } catch (ze) {
    const msg =
      ze instanceof z.ZodError
        ? ze.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ")
        : String(ze);
    throw new Error(`Analysis JSON validation failed: ${msg}`);
  }
  const questionnaire = mergeQuestionnaire(payload.questionnaire ?? []);

  try {
    return analysisResultSchema.parse({
      ...payload,
      questionnaire,
    });
  } catch (ze) {
    const msg =
      ze instanceof z.ZodError
        ? ze.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ")
        : String(ze);
    throw new Error(`Analysis output invalid after merge: ${msg}`);
  }
}
