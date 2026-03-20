import { z } from "zod";
import { QUESTION_IDS } from "@/lib/constants/questionnaire";

const questionIdEnum = z.enum(QUESTION_IDS);

export const performanceDimensionSchema = z.object({
  score: z.number().min(0).max(10),
  rationale: z.string(),
});

export const analysisResultSchema = z.object({
  summary: z.string(),
  callSentiment: z.enum(["positive", "neutral", "negative"]),
  agentTalkPct: z.number().min(0).max(100),
  customerTalkPct: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(10),
  performance: z.object({
    communicationClarity: performanceDimensionSchema,
    politeness: performanceDimensionSchema,
    businessKnowledge: performanceDimensionSchema,
    problemHandling: performanceDimensionSchema,
    listeningAbility: performanceDimensionSchema,
  }),
  questionnaire: z.array(
    z.object({
      questionId: questionIdEnum,
      asked: z.boolean(),
    }),
  ),
  topKeywords: z.array(
    z.object({
      label: z.string(),
      emoji: z.string().optional(),
      count: z.number().int().min(1).optional(),
    }),
  ),
  actionItems: z.array(z.string()),
  positiveObservations: z.array(z.string()),
  negativeObservations: z.array(z.string()),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
