import type { AnalysisResult } from "@/lib/schemas/analysis";

const PERF_KEYS = [
  "communicationClarity",
  "politeness",
  "businessKnowledge",
  "problemHandling",
  "listeningAbility",
] as const;

export function parsePerformance(
  raw: unknown,
): AnalysisResult["performance"] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Partial<AnalysisResult["performance"]> = {};
  for (const k of PERF_KEYS) {
    const v = o[k];
    if (!v || typeof v !== "object") return null;
    const s = v as Record<string, unknown>;
    if (typeof s.score !== "number" || typeof s.rationale !== "string") {
      return null;
    }
    out[k] = { score: s.score, rationale: s.rationale };
  }
  return out as AnalysisResult["performance"];
}

export const PERFORMANCE_LABELS: Record<
  (typeof PERF_KEYS)[number],
  { title: string; description: string }
> = {
  communicationClarity: {
    title: "Communication clarity",
    description:
      "Was the agent clear, concise, and easy to understand throughout the call?",
  },
  politeness: {
    title: "Politeness",
    description:
      "Was the tone consistently respectful, empathetic, and professional?",
  },
  businessKnowledge: {
    title: "Business knowledge",
    description:
      "Did the agent demonstrate strong product and industry knowledge when answering questions?",
  },
  problemHandling: {
    title: "Problem handling",
    description:
      "Did the agent handle objections calmly, logically, and constructively?",
  },
  listeningAbility: {
    title: "Listening ability",
    description:
      "Did the agent give the customer adequate space and opportunity to speak?",
  },
};
