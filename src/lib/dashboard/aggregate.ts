import type {
  CallInsightsRow,
  CallRow,
  DashboardAggregate,
} from "@/types/call";

export type Row = CallRow & { call_insights: CallInsightsRow | null };

export function buildDashboardAggregate(rows: Row[]): DashboardAggregate {
  const complete = rows.filter((r) => r.status === "complete" && r.call_insights);

  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  let scoreSum = 0;
  let scoreCount = 0;
  let durationSum = 0;
  let durationCount = 0;
  let actionItemsTotal = 0;
  const keywordTotals = new Map<string, number>();

  for (const r of complete) {
    const ins = r.call_insights;
    if (!ins) continue;

    if (ins.call_sentiment === "positive") sentiment.positive += 1;
    else if (ins.call_sentiment === "neutral") sentiment.neutral += 1;
    else if (ins.call_sentiment === "negative") sentiment.negative += 1;

    if (typeof ins.overall_score === "number") {
      scoreSum += ins.overall_score;
      scoreCount += 1;
    }

    if (typeof r.duration_seconds === "number") {
      durationSum += r.duration_seconds;
      durationCount += 1;
    }

    const items = Array.isArray(ins.action_items) ? ins.action_items : [];
    actionItemsTotal += items.length;

    const kws = Array.isArray(ins.top_keywords) ? ins.top_keywords : [];
    for (const kw of kws) {
      const label = (kw.label ?? "").trim();
      if (!label) continue;
      const key = label.toLowerCase();
      const add = typeof kw.count === "number" ? kw.count : 1;
      keywordTotals.set(key, (keywordTotals.get(key) ?? 0) + add);
    }
  }

  const topKeywords = Array.from(keywordTotals.entries())
    .map(([key, count]) => ({ label: capitalizeWords(key), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    totalCalls: complete.length,
    sentiment,
    averageScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    averageDurationSeconds: durationCount > 0 ? durationSum / durationCount : null,
    topKeywords,
    actionItemsTotal,
  };
}

function capitalizeWords(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
