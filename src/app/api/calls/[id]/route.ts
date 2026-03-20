import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  isPersistenceBackendAvailable,
  isLocalPersistenceMode,
} from "@/lib/persistence/config";
import {
  localReadCall,
  localReadInsights,
} from "@/lib/persistence/local-calls-store";
import { BUCKET } from "@/lib/pipeline/process-call";
import type { CallDetailResponse, CallInsightsRow, CallRow } from "@/types/call";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  if (!isPersistenceBackendAvailable()) {
    return NextResponse.json(
      { error: "No database configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  try {
    if (isLocalPersistenceMode()) {
      const call = await localReadCall(id);
      if (!call) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const insights = await localReadInsights(id);
      const body: CallDetailResponse = {
        call,
        insights,
        audioSignedUrl: `/api/calls/${id}/audio`,
      };
      return NextResponse.json(body);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("calls")
      .select("*, call_insights(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const raw = data as CallRow & {
      call_insights: CallInsightsRow | CallInsightsRow[] | null;
    };
    const nested = raw.call_insights;
    const insightsRow = Array.isArray(nested) ? nested[0] ?? null : nested;
    const row = { ...raw, call_insights: insightsRow } as CallRow & {
      call_insights: CallInsightsRow | null;
    };
    const call: CallRow = {
      id: row.id,
      created_at: row.created_at,
      original_filename: row.original_filename,
      duration_seconds: row.duration_seconds,
      audio_path: row.audio_path,
      status: row.status,
      error_message: row.error_message,
    };
    const insights = row.call_insights;

    let audioSignedUrl: string | null = null;
    if (row.audio_path && isSupabaseConfigured()) {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.audio_path, 60 * 60);

      if (!signError && signed?.signedUrl) {
        audioSignedUrl = signed.signedUrl;
      }
    }

    const body: CallDetailResponse = {
      call,
      insights,
      audioSignedUrl,
    };

    return NextResponse.json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load call";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
