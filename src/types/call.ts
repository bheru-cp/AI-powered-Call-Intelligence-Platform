import type { AnalysisResult } from "@/lib/schemas/analysis";

export type CallStatus =
  | "uploaded"
  | "transcribing"
  | "analyzing"
  | "complete"
  | "failed";

export type CallRow = {
  id: string;
  created_at: string;
  original_filename: string;
  duration_seconds: number | null;
  audio_path: string;
  status: CallStatus;
  error_message: string | null;
};

export type CallInsightsRow = {
  call_id: string;
  transcript: string | null;
  summary: string | null;
  call_sentiment: "positive" | "neutral" | "negative" | null;
  agent_talk_pct: number | null;
  customer_talk_pct: number | null;
  overall_score: number | null;
  performance: AnalysisResult["performance"] | Record<string, unknown>;
  questionnaire: AnalysisResult["questionnaire"];
  top_keywords: AnalysisResult["topKeywords"];
  action_items: string[];
  positive_observations: string[];
  negative_observations: string[];
  updated_at: string;
};

export type CallWithInsights = CallRow & {
  call_insights: CallInsightsRow | null;
};

export type CallDetailResponse = {
  call: CallRow;
  insights: CallInsightsRow | null;
  audioSignedUrl: string | null;
};

export type CallListItem = {
  id: string;
  created_at: string;
  original_filename: string;
  status: CallStatus;
  call_sentiment: "positive" | "neutral" | "negative" | null;
  overall_score: number | null;
  duration_seconds: number | null;
};

export type DashboardAggregate = {
  totalCalls: number;
  sentiment: { positive: number; neutral: number; negative: number };
  averageScore: number | null;
  averageDurationSeconds: number | null;
  topKeywords: { label: string; count: number }[];
  actionItemsTotal: number;
};

export type CallsListResponse = {
  items: CallListItem[];
  aggregate: DashboardAggregate;
  /** False when OPENAI_API_KEY is missing (upload/analyze will not work). */
  canProcessAudio?: boolean;
};
