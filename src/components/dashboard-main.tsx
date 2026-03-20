"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ArrowUpRight,
  CheckSquare,
  Clock,
  KeyRound,
  MoreHorizontal,
  Phone,
  Rows3,
  Smile,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import type { CallsListResponse } from "@/types/call";
import { formatDurationSeconds, formatScore } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SetupBanner } from "@/components/setup-banner";
import { cn } from "@/lib/utils";

const SENTIMENT_COLORS = {
  positive: "hsl(142 70% 40%)",
  neutral: "hsl(220 10% 55%)",
  negative: "hsl(350 70% 48%)",
} as const;

const surfaceCard =
  "rounded-2xl border border-border/50 bg-card/95 shadow-sm ring-1 ring-foreground/[0.04] dark:bg-card/80";

const METRIC_VARIANTS = [
  {
    surface:
      "bg-[#4a2a7c] text-white shadow-lg shadow-[#4a2a7c]/25 ring-1 ring-white/10 dark:bg-[#3d2468]",
    iconWrap: "bg-white/20 text-white ring-white/20",
    pill: "bg-white/20 text-white",
  },
  {
    surface:
      "bg-[#a61e6d] text-white shadow-lg shadow-[#a61e6d]/25 ring-1 ring-white/10 dark:bg-[#8f195d]",
    iconWrap: "bg-white/20 text-white ring-white/20",
    pill: "bg-white/20 text-white",
  },
  {
    surface:
      "bg-[#b8860b] text-white shadow-lg shadow-[#b8860b]/20 ring-1 ring-white/15 dark:bg-[#9a7209]",
    iconWrap: "bg-white/25 text-white ring-white/25",
    pill: "bg-white/25 text-white",
  },
  {
    surface:
      "bg-[#0d6e7a] text-white shadow-lg shadow-[#0d6e7a]/25 ring-1 ring-white/10 dark:bg-[#0a5c66]",
    iconWrap: "bg-white/20 text-white ring-white/20",
    pill: "bg-white/20 text-white",
  },
] as const;

const KEYWORD_TAG_STYLES = [
  "border-violet-500/30 bg-violet-500/12 text-violet-950 dark:text-violet-100",
  "border-fuchsia-500/30 bg-fuchsia-500/12 text-fuchsia-950 dark:text-fuchsia-100",
  "border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-100",
  "border-cyan-500/30 bg-cyan-500/12 text-cyan-950 dark:text-cyan-100",
  "border-emerald-500/30 bg-emerald-500/12 text-emerald-950 dark:text-emerald-100",
  "border-sky-500/30 bg-sky-500/12 text-sky-950 dark:text-sky-100",
] as const;

function MetricCard({
  title,
  icon: Icon,
  badge,
  variant,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  variant: 0 | 1 | 2 | 3;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const Wrapper = reduce ? "div" : motion.div;
  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
      };
  const v = METRIC_VARIANTS[variant];
  return (
    <Wrapper {...motionProps}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-6 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl",
          v.surface,
        )}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/[0.07]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-14 -left-8 size-40 rounded-full bg-black/10"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
                v.iconWrap,
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-semibold leading-snug tracking-tight">{title}</span>
          </div>
        </div>
        <div className="relative mt-5 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
          {children}
        </div>
      </div>
    </Wrapper>
  );
}

export function DashboardMain() {
  const [data, setData] = React.useState<CallsListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calls", { cache: "no-store" });
      const body = (await res.json()) as CallsListResponse & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Failed to load dashboard");
        if (res.status !== 503) toast.error(body.error ?? "Failed to load");
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setError("Network error");
      toast.error("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="space-y-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-1" />
        </div>
        <Skeleton className="min-h-48 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <SetupBanner
        message={
          error.includes("No database configured")
            ? `${error} For production, add Supabase (migration + call-audio bucket). For local-only, use NODE_ENV=development without Supabase or set CALL_INTEL_LOCAL_STORE=true.`
            : error
        }
      />
    );
  }

  const agg = data?.aggregate;
  const items = data?.items ?? [];
  const keywordRows = agg?.topKeywords ?? [];

  const pieData = agg
    ? [
        { name: "Positive", value: agg.sentiment.positive, key: "positive" as const },
        { name: "Neutral", value: agg.sentiment.neutral, key: "neutral" as const },
        { name: "Negative", value: agg.sentiment.negative, key: "negative" as const },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-10">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total calls processed" icon={Phone} badge="Library" variant={0}>
          {agg?.totalCalls ?? 0}
        </MetricCard>
        <MetricCard title="Average call score" icon={Star} badge="Quality" variant={1}>
          {formatScore(agg?.averageScore ?? null)}
        </MetricCard>
        <MetricCard title="Avg. call duration" icon={Clock} badge="Duration" variant={2}>
          {agg?.averageDurationSeconds != null
            ? formatDurationSeconds(agg.averageDurationSeconds)
            : "0s"}
        </MetricCard>
        <MetricCard title="Action items total" icon={CheckSquare} badge="Follow-ups" variant={3}>
          {agg?.actionItemsTotal ?? 0}
        </MetricCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className={cn("lg:col-span-1/2", surfaceCard)}>
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 bg-muted/20 px-6 pb-4 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-700 ring-1 ring-cyan-500/25 dark:text-cyan-400">
              <Smile className="size-5" />
            </span>
            <CardTitle className="text-base font-semibold tracking-wide uppercase">
              Sentiment split
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-5">
            {pieData.length === 0 ? (
              <p className="flex min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 text-center text-sm text-muted-foreground">
                No completed calls yet — upload a recording to see sentiment mix.
              </p>
            ) : (
              <div className="flex min-h-[14rem] flex-col">
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%" minHeight={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={SENTIMENT_COLORS[entry.key]}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--popover)",
                          color: "var(--popover-foreground)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  {pieData.map((d) => (
                    <li key={d.key} className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: SENTIMENT_COLORS[d.key] }}
                        aria-hidden
                      />
                      <span className="font-medium text-foreground">{d.name}</span>
                      <span className="tabular-nums">({d.value})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn("lg:col-span-2", surfaceCard)}>
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 bg-muted/20 px-6 pb-4 pt-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-700 ring-1 ring-fuchsia-500/25 dark:text-fuchsia-400">
              <KeyRound className="size-5" />
            </span>
            <CardTitle className="text-base font-semibold tracking-wide uppercase">
              Top keywords
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-5">
            {keywordRows.length === 0 ? (
              <p className="flex min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 text-center text-sm text-muted-foreground">
                Keywords will appear after calls are analyzed.
              </p>
            ) : (
              <div className="flex min-h-[14rem] flex-wrap content-start gap-2">
                {keywordRows.map((k, i) => (
                  <span
                    key={`${k.label}-${i}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                      KEYWORD_TAG_STYLES[i % KEYWORD_TAG_STYLES.length],
                    )}
                  >
                    <span className="max-w-[200px] truncate">{k.label}</span>
                    <span className="tabular-nums opacity-80">×{k.count}</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cn("overflow-hidden", surfaceCard)}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Rows3 className="size-5" />
            </span>
            <CardTitle className="text-base font-semibold tracking-wide uppercase sm:text-lg">
              Recent calls
            </CardTitle>
          </div>
          {items.length > 0 ? (
            <p className="text-xs font-semibold tabular-nums text-muted-foreground">
              {items.length} {items.length === 1 ? "recording" : "recordings"}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-0">
          {items.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-muted-foreground">
              No calls yet. Upload one from the home page.
            </p>
          ) : (
            <>
              <div className="grid gap-3 p-4 sm:hidden">
                {items.map((row) => (
                  <Link
                    key={row.id}
                    href={`/calls/${row.id}`}
                    className={cn(
                      "group block rounded-xl border border-border/60 bg-muted/10 p-4 shadow-sm ring-1 ring-foreground/[0.03]",
                      "transition-[box-shadow,background-color] hover:bg-muted/20 hover:shadow-md",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 font-medium leading-snug">
                        {row.original_filename}
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <time dateTime={row.created_at}>
                        {new Date(row.created_at).toLocaleString()}
                      </time>
                      <Badge variant="secondary" className="capitalize">
                        {row.status}
                      </Badge>
                      {row.call_sentiment ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            row.call_sentiment === "positive" &&
                              "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
                            row.call_sentiment === "negative" &&
                              "border-rose-500/40 text-rose-700 dark:text-rose-400",
                          )}
                        >
                          {row.call_sentiment}
                        </Badge>
                      ) : null}
                      <span className="ml-auto font-semibold tabular-nums text-foreground">
                        {formatScore(row.overall_score)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="bg-muted/30 px-6 font-semibold">File</TableHead>
                      <TableHead className="whitespace-nowrap bg-muted/30 font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="bg-muted/30 font-semibold">Status</TableHead>
                      <TableHead className="bg-muted/30 font-semibold">Sentiment</TableHead>
                      <TableHead className="bg-muted/30 px-6 text-right font-semibold">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow
                        key={row.id}
                        className="border-border/40 transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="max-w-[220px] px-6">
                          <Link
                            href={`/calls/${row.id}`}
                            className="group inline-flex max-w-full items-center gap-1 font-medium text-foreground"
                          >
                            <span className="truncate underline-offset-4 group-hover:underline">
                              {row.original_filename}
                            </span>
                            <ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                          {new Date(row.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.call_sentiment ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize",
                                row.call_sentiment === "positive" &&
                                  "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
                                row.call_sentiment === "negative" &&
                                  "border-rose-500/40 text-rose-700 dark:text-rose-400",
                              )}
                            >
                              {row.call_sentiment}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 text-right tabular-nums font-medium">
                          {formatScore(row.overall_score)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
