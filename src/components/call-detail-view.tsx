"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AudioWaveform,
  BookMarked,
  Check,
  ChevronLeft,
  ClipboardList,
  HeartHandshake,
  KeyRound,
  ListTodo,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Mic2,
  Puzzle,
  Smile,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { CallDetailResponse } from "@/types/call";
import { SALES_QUESTIONS } from "@/lib/constants/questionnaire";
import { parsePerformance, PERFORMANCE_LABELS } from "@/lib/call-insights";
import { formatDurationSeconds, formatScore } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Props = { callId: string };

const surfaceCard =
  "rounded-2xl border border-border/50 bg-card/95 shadow-sm ring-1 ring-foreground/[0.04] dark:bg-card/80";

const KEYWORD_TAG_STYLES = [
  "border-violet-500/30 bg-violet-500/12 text-violet-950 dark:text-violet-100",
  "border-fuchsia-500/30 bg-fuchsia-500/12 text-fuchsia-950 dark:text-fuchsia-100",
  "border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-100",
  "border-cyan-500/30 bg-cyan-500/12 text-cyan-950 dark:text-cyan-100",
  "border-emerald-500/30 bg-emerald-500/12 text-emerald-950 dark:text-emerald-100",
  "border-sky-500/30 bg-sky-500/12 text-sky-950 dark:text-sky-100",
] as const;

const PERF_ICONS = {
  communicationClarity: MessageCircle,
  politeness: HeartHandshake,
  businessKnowledge: BookMarked,
  problemHandling: Puzzle,
  listeningAbility: AudioWaveform,
} as const satisfies Record<keyof typeof PERFORMANCE_LABELS, React.ComponentType<{ className?: string }>>;

export function CallDetailView({ callId }: Props) {
  const reduce = useReducedMotion();
  const [data, setData] = React.useState<CallDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  const fetchDetail = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/calls/${callId}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        setData(null);
        return;
      }
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        toast.error(b.error ?? "Failed to load call");
        return;
      }
      const body = (await res.json()) as CallDetailResponse;
      setData(body);
      setNotFound(false);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [callId]);

  React.useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const status = data?.call.status;
  const shouldPoll =
    status === "uploaded" || status === "transcribing" || status === "analyzing";

  React.useEffect(() => {
    if (!shouldPoll) return;
    const t = setInterval(() => {
      void fetchDetail();
    }, 3000);
    return () => clearInterval(t);
  }, [shouldPoll, fetchDetail]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <Card className={cn("max-w-md", surfaceCard)}>
        <CardHeader>
          <CardTitle className="text-base">Call not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This ID may be invalid or the recording was removed.
          </p>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { call, insights, audioSignedUrl } = data;
  const perf = insights ? parsePerformance(insights.performance) : null;
  const askedMap = new Map(
    (insights?.questionnaire ?? []).map((q) => [q.questionId, q.asked]),
  );

  const Section = ({
    id,
    title,
    description,
    children,
  }: {
    id: string;
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => {
    if (reduce) {
      return (
        <section id={id} className="scroll-mt-24 space-y-5">
          <div className="border-l-4 border-primary/35 pl-4">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </section>
      );
    }
    return (
      <motion.section
        id={id}
        className="scroll-mt-24 space-y-5"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <div className="border-l-4 border-primary/35 pl-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </motion.section>
    );
  };

  const isPipelineActive =
    call.status === "uploaded" ||
    call.status === "transcribing" ||
    call.status === "analyzing";

  const processingLabel =
    call.status === "uploaded"
      ? "Queued — preparing audio…"
      : call.status === "transcribing"
        ? "Transcribing with Whisper…"
        : call.status === "analyzing"
          ? "Running GPT analysis…"
          : "Processing…";

  return (
    <div className="space-y-10 pb-16">
      <Card className={cn("overflow-hidden bg-gradient-to-br from-card via-card to-primary/[0.04]", surfaceCard)}>
        <CardContent className="space-y-4 pt-6">
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Dashboard
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary/80">
              Call intelligence
            </p>
            <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              {call.original_filename}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <time dateTime={call.created_at}>{new Date(call.created_at).toLocaleString()}</time>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <span>{formatDurationSeconds(call.duration_seconds)}</span>
              <Badge variant="secondary" className="capitalize">
                {call.status}
              </Badge>
            </div>
          </div>
          {call.status === "failed" && call.error_message ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {call.error_message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {isPipelineActive ? (
        <Card
          className={cn(
            "border-dashed border-primary/25 bg-primary/[0.03] dark:bg-primary/[0.06]",
            surfaceCard,
          )}
        >
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Loader2 className="size-5 animate-spin" aria-hidden />
            </span>
            <CardTitle className="text-base">Processing</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {processingLabel} This page checks for updates every few seconds.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {insights ? (
        <>
          <Section
            id="overview"
            title="Call overview"
            description="Summary, sentiment, recording, transcript, talk-time split, and overall score."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={surfaceCard}>
                <CardHeader className="border-b border-border/50 bg-muted/15">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MessageSquareText className="size-4" />
                    </span>
                    Call summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-pretty text-sm leading-relaxed text-muted-foreground">
                  {insights.summary}
                </CardContent>
              </Card>
              <Card className={surfaceCard}>
                <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 bg-muted/15">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/15 text-fuchsia-700 ring-1 ring-fuchsia-500/20 dark:text-fuchsia-400">
                    <Smile className="size-4" />
                  </span>
                  <CardTitle className="text-base">Call sentiment</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-sm capitalize",
                      insights.call_sentiment === "positive" &&
                        "border-emerald-500/50 text-emerald-700 dark:text-emerald-400",
                      insights.call_sentiment === "negative" &&
                        "border-rose-500/50 text-rose-700 dark:text-rose-400",
                    )}
                  >
                    {insights.call_sentiment ?? "unknown"}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            <Card className={surfaceCard}>
              <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 bg-muted/15">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-700 ring-1 ring-cyan-500/20 dark:text-cyan-400">
                  <Mic2 className="size-4" />
                </span>
                <CardTitle className="text-base">Recording and transcript</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {audioSignedUrl ? (
                  <audio
                    controls
                    className="w-full rounded-lg border border-border/80 bg-muted/30 shadow-inner"
                    src={audioSignedUrl}
                  >
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Signed playback URL unavailable. Check Storage policies and bucket{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">call-audio</code>.
                  </p>
                )}
                <Tabs defaultValue="transcript">
                  <TabsContent value="transcript" className="mt-3">
                    <ScrollArea className="h-64 rounded-lg text-sm leading-relaxed ring-foreground/[0.04]">
                      {insights.transcript}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className={surfaceCard}>
                <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 bg-muted/15">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-400">
                    <Users className="size-4" />
                  </span>
                  <CardTitle className="text-base">Talk time analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="bg-muted/25 font-semibold">Speaker</TableHead>
                        <TableHead className="bg-muted/25 text-right font-semibold">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Agent</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatScore(insights.agent_talk_pct, 0)}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatScore(insights.customer_talk_pct, 0)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className={surfaceCard}>
                <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 bg-muted/15">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Star className="size-4" />
                  </span>
                  <CardTitle className="text-base">Overall call score</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-4xl font-semibold tabular-nums tracking-tight">
                    {formatScore(insights.overall_score)}
                  </p>
                  <Progress
                    className="h-2.5"
                    value={((insights.overall_score ?? 0) / 10) * 100}
                  />
                </CardContent>
              </Card>
            </div>
          </Section>

          <Separator className="bg-border/60" />

          <Section
            id="performance"
            title="Agent sentiment and performance scoring"
            description="Five core dimensions evaluated from the transcript."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {perf
                ? (Object.keys(PERFORMANCE_LABELS) as (keyof typeof PERFORMANCE_LABELS)[]).map(
                    (key) => {
                      const dim = perf[key];
                      const meta = PERFORMANCE_LABELS[key];
                      const PerfIcon = PERF_ICONS[key];
                      return (
                        <Card
                          key={key}
                          className={cn(
                            surfaceCard,
                            "overflow-hidden transition-shadow hover:shadow-md",
                          )}
                        >
                          <CardHeader className="flex flex-row items-center gap-3 border-b border-border/40 bg-muted/10 pb-4">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                              <PerfIcon className="size-4" />
                            </span>
                            <CardTitle className="text-base leading-snug">{meta.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-4">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                                {formatScore(dim.score)}
                              </span>
                              <span className="text-xs text-muted-foreground">out of 10</span>
                            </div>
                            <Progress value={(dim.score / 10) * 100} className="h-2.5" />
                            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                              {dim.rationale}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    },
                  )
                : (
                    <p className="text-sm text-muted-foreground">
                      Performance scores are not available for this call.
                    </p>
                  )}
            </div>
          </Section>

          <Separator className="bg-border/60" />

          <Section
            id="discovery"
            title="Business questionnaire and keyword analysis"
            description="Discovery coverage against the predefined kitchen sales question set, plus top topics."
          >
            <Card className={cn(surfaceCard, "overflow-hidden")}>
              <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 bg-muted/15">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-700 ring-1 ring-violet-500/20 dark:text-violet-400">
                  <ClipboardList className="size-4" />
                </span>
                <CardTitle className="text-base">Business questionnaire coverage</CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="bg-muted/25 px-6 font-semibold">Question topic</TableHead>
                        <TableHead className="w-32 bg-muted/25 px-6 text-center font-semibold">
                          Asked?
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SALES_QUESTIONS.map((q, i) => {
                        const asked = askedMap.get(q.id) ?? false;
                        return (
                          <TableRow
                            key={q.id}
                            className={i % 2 === 0 ? "bg-muted/30" : undefined}
                          >
                            <TableCell className="max-w-xl px-6 text-sm">{q.salesQuestion}</TableCell>
                            <TableCell className="px-6">
                              <div className="flex justify-center">
                                {asked ? (
                                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    <span className="flex size-6 items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/10">
                                      <Check className="size-3.5" strokeWidth={3} />
                                    </span>
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 dark:text-rose-400">
                                    <X className="size-5" strokeWidth={2.5} />
                                    No
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className={surfaceCard}>
              <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 bg-muted/15">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/15 text-fuchsia-700 ring-1 ring-fuchsia-500/20 dark:text-fuchsia-400">
                  <KeyRound className="size-4" />
                </span>
                <CardTitle className="text-base">Top keywords discussed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(insights.top_keywords ?? []).map((kw, idx) => (
                    <span
                      key={`${kw.label}-${idx}`}
                      className={cn(
                        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                        KEYWORD_TAG_STYLES[idx % KEYWORD_TAG_STYLES.length],
                      )}
                    >
                      {kw.emoji ? (
                        <span className="shrink-0" aria-hidden>
                          {kw.emoji}
                        </span>
                      ) : null}
                      <span className="truncate">{kw.label}</span>
                      {kw.count != null ? (
                        <span className="shrink-0 tabular-nums opacity-80">×{kw.count}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Section>

          <Separator className="bg-border/60" />

          <Section
            id="follow-up"
            title="Follow-up actions and AI notes"
            description="Structured next steps plus strengths and improvement areas."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={surfaceCard}>
                <CardHeader className="border-b border-border/50 bg-muted/15">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ListTodo className="size-4" />
                    </span>
                    Follow-up action items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {(insights.action_items ?? []).map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-3 rounded-xl px-3 py-2.5 ring-foreground/[0.02]"
                      >
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <div className="grid gap-4">
                <Card className={surfaceCard}>
                  <CardHeader className="flex flex-row items-center gap-3 border-b border-emerald-500/15 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300">
                      <ThumbsUp className="size-4" />
                    </span>
                    <CardTitle className="text-base text-emerald-800 dark:text-emerald-300">
                      Positive observations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {(insights.positive_observations ?? []).map((t, i) => (
                        <li key={i} className="flex gap-3 rounded-lg bg-muted/10 px-2 py-1">
                          <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-600/80" />
                          <span className="leading-relaxed">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className={surfaceCard}>
                  <CardHeader className="flex flex-row items-center gap-3 border-b border-rose-500/15 bg-rose-500/[0.06] dark:bg-rose-500/[0.08]">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-700 ring-1 ring-rose-500/30 dark:text-rose-300">
                      <ThumbsDown className="size-4" />
                    </span>
                    <CardTitle className="text-base text-rose-800 dark:text-rose-300">
                      Negative observations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {(insights.negative_observations ?? []).map((t, i) => (
                        <li key={i} className="flex gap-3 rounded-lg bg-muted/10 px-2 py-1">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500/80" />
                          <span className="leading-relaxed">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>
        </>
      ) : null}
    </div>
  );
}
