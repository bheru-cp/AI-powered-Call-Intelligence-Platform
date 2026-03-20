import { NextResponse } from "next/server";
import { isOpenAIConfigured } from "@/lib/openai/client";
import {
  isPersistenceBackendAvailable,
  isLocalPersistenceMode,
} from "@/lib/persistence/config";
import { localReadCall } from "@/lib/persistence/local-calls-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { runCallProcessing } from "@/lib/pipeline/process-call";

export const runtime = "nodejs";
/** Whisper + GPT can exceed default proxy limits; align with main calls route. */
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/**
 * Runs transcription + analysis in this request (keeps the connection open).
 * Use this after POST /api/calls returns 202 — background work after 202 is unreliable behind nginx/PM2.
 */
export async function POST(_request: Request, context: Params) {
  if (!isPersistenceBackendAvailable()) {
    return NextResponse.json(
      { error: "No storage configured." },
      { status: 503 },
    );
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on the server." },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  let exists = false;
  if (isLocalPersistenceMode()) {
    exists = Boolean(await localReadCall(id));
  } else {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("calls").select("id").eq("id", id).maybeSingle();
    exists = Boolean(data);
  }

  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await runCallProcessing(id);

  if (!result.ok) {
    return NextResponse.json(
      {
        id,
        status: "failed" as const,
        error: result.error ?? "Processing failed",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ id, status: "complete" as const });
}
