import path from "path";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isLocalPersistenceMode } from "@/lib/persistence/config";
import {
  localUpdateCall,
  localWriteCallAndAudio,
  localWriteInsights,
  localDeleteCallDir,
  localReadCall,
  localReadAudioBuffer,
} from "@/lib/persistence/local-calls-store";
import { transcribeAudioBuffer } from "@/lib/openai/transcribe";
import { analyzeTranscript } from "@/lib/openai/analyze";
import { resolveAudioMimeType } from "@/lib/openai/resolve-audio-mime";
import type { AnalysisResult } from "@/lib/schemas/analysis";
import type { CallInsightsRow, CallRow } from "@/types/call";

const BUCKET = "call-audio";

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  return base.length > 0 ? base : "recording";
}

function analysisToInsightsRow(
  callId: string,
  transcript: string,
  analysis: AnalysisResult,
): CallInsightsRow {
  return {
    call_id: callId,
    transcript,
    summary: analysis.summary,
    call_sentiment: analysis.callSentiment,
    agent_talk_pct: analysis.agentTalkPct,
    customer_talk_pct: analysis.customerTalkPct,
    overall_score: analysis.overallScore,
    performance: analysis.performance,
    questionnaire: analysis.questionnaire,
    top_keywords: analysis.topKeywords,
    action_items: analysis.actionItems,
    positive_observations: analysis.positiveObservations,
    negative_observations: analysis.negativeObservations,
    updated_at: new Date().toISOString(),
  };
}

export type PrepareCallUploadParams = {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
};

/** Persist upload only; returns quickly so the HTTP response can return before Whisper/GPT finish. */
export async function prepareCallUpload(
  params: PrepareCallUploadParams,
): Promise<{ callId: string }> {
  if (isLocalPersistenceMode()) {
    return prepareCallUploadLocal(params);
  }
  return prepareCallUploadSupabase(params);
}

async function prepareCallUploadLocal(
  params: PrepareCallUploadParams,
): Promise<{ callId: string }> {
  const callId = randomUUID();
  const safeName = sanitizeFilename(params.originalFilename);
  const audioPath = `${callId}/${safeName}`;
  const now = new Date().toISOString();

  const initialCall: CallRow = {
    id: callId,
    created_at: now,
    original_filename: params.originalFilename,
    duration_seconds: null,
    audio_path: audioPath,
    status: "transcribing",
    error_message: null,
  };

  try {
    await localWriteCallAndAudio({
      call: initialCall,
      audioBuffer: params.buffer,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save call locally";
    await localDeleteCallDir(callId);
    throw new Error(message);
  }

  return { callId };
}

async function prepareCallUploadSupabase(
  params: PrepareCallUploadParams,
): Promise<{ callId: string }> {
  const supabase = getSupabaseAdmin();
  const callId = randomUUID();
  const safeName = sanitizeFilename(params.originalFilename);
  const audioPath = `${callId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(audioPath, params.buffer, {
      contentType: params.mimeType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("calls").insert({
    id: callId,
    original_filename: params.originalFilename,
    audio_path: audioPath,
    status: "transcribing",
    duration_seconds: null,
    error_message: null,
  });

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([audioPath]);
    throw new Error(`Failed to create call: ${insertError.message}`);
  }

  return { callId };
}

/** Run Whisper + GPT. Safe to call from a long-lived POST (e.g. /api/calls/[id]/process). Does not throw; updates status on failure. */
export async function runCallProcessing(
  callId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (isLocalPersistenceMode()) {
      const existing = await localReadCall(callId);
      if (existing?.status === "complete") {
        return { ok: true };
      }
      return await runCallProcessingLocal(callId);
    }
    const supabase = getSupabaseAdmin();
    const { data: row } = await supabase
      .from("calls")
      .select("status")
      .eq("id", callId)
      .maybeSingle();
    if (row?.status === "complete") {
      return { ok: true };
    }
    return await runCallProcessingSupabase(callId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    try {
      await markCallFailed(callId, message);
    } catch {
      /* secondary failure */
    }
    return { ok: false, error: message };
  }
}

async function markCallFailed(callId: string, message: string): Promise<void> {
  if (isLocalPersistenceMode()) {
    await localUpdateCall(callId, { status: "failed", error_message: message });
    return;
  }
  const supabase = getSupabaseAdmin();
  await supabase
    .from("calls")
    .update({ status: "failed", error_message: message })
    .eq("id", callId);
}

async function runCallProcessingLocal(
  callId: string,
): Promise<{ ok: boolean; error?: string }> {
  const call = await localReadCall(callId);
  if (!call) {
    return { ok: false, error: "Call not found" };
  }

  const safeName = path.basename(call.audio_path);
  let buffer: Buffer;
  try {
    buffer = await localReadAudioBuffer(call);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Missing audio file";
    await localUpdateCall(callId, { status: "failed", error_message: message });
    return { ok: false, error: message };
  }

  const mimeType = resolveAudioMimeType(safeName, "");

  try {
    const { text, durationSeconds } = await transcribeAudioBuffer({
      buffer,
      filename: safeName,
      mimeType,
    });

    await localUpdateCall(callId, {
      duration_seconds: durationSeconds,
      status: "analyzing",
    });

    const analysis = await analyzeTranscript(text);
    const insightsRow = analysisToInsightsRow(callId, text, analysis);
    await localWriteInsights(insightsRow);

    await localUpdateCall(callId, { status: "complete" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    try {
      await localUpdateCall(callId, { status: "failed", error_message: message });
    } catch {
      /* avoid masking */
    }
    return { ok: false, error: message };
  }

  return { ok: true };
}

async function runCallProcessingSupabase(
  callId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data: callRow, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", callId)
    .maybeSingle();

  if (error || !callRow) {
    return { ok: false, error: "Call not found" };
  }

  const audioPath = callRow.audio_path as string;
  const safeName = path.basename(audioPath);

  const { data: blob, error: dlError } = await supabase.storage
    .from(BUCKET)
    .download(audioPath);

  if (dlError || !blob) {
    const message = dlError?.message ?? "Could not read uploaded audio from storage";
    await supabase
      .from("calls")
      .update({ status: "failed", error_message: message })
      .eq("id", callId);
    return { ok: false, error: message };
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const mimeType = resolveAudioMimeType(safeName, "");

  try {
    const { text, durationSeconds } = await transcribeAudioBuffer({
      buffer,
      filename: safeName,
      mimeType,
    });

    await supabase
      .from("calls")
      .update({
        duration_seconds: durationSeconds,
        status: "analyzing",
      })
      .eq("id", callId);

    const analysis = await analyzeTranscript(text);

    await persistInsightsSupabase(supabase, callId, text, analysis);

    await supabase.from("calls").update({ status: "complete" }).eq("id", callId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    try {
      await supabase
        .from("calls")
        .update({ status: "failed", error_message: message })
        .eq("id", callId);
    } catch {
      /* ignore */
    }
    return { ok: false, error: message };
  }

  return { ok: true };
}

async function persistInsightsSupabase(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  callId: string,
  transcript: string,
  analysis: AnalysisResult,
) {
  const { error } = await supabase.from("call_insights").upsert(
    {
      call_id: callId,
      transcript,
      summary: analysis.summary,
      call_sentiment: analysis.callSentiment,
      agent_talk_pct: analysis.agentTalkPct,
      customer_talk_pct: analysis.customerTalkPct,
      overall_score: analysis.overallScore,
      performance: analysis.performance,
      questionnaire: analysis.questionnaire,
      top_keywords: analysis.topKeywords,
      action_items: analysis.actionItems,
      positive_observations: analysis.positiveObservations,
      negative_observations: analysis.negativeObservations,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "call_id" },
  );

  if (error) {
    throw new Error(`Failed to save insights: ${error.message}`);
  }
}

export { BUCKET };
