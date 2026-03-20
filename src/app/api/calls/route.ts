import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isOpenAIConfigured } from "@/lib/openai/client";
import {
  isPersistenceBackendAvailable,
  isLocalPersistenceMode,
} from "@/lib/persistence/config";
import { localListRows } from "@/lib/persistence/local-calls-store";
import { prepareCallUpload } from "@/lib/pipeline/process-call";
import { buildDashboardAggregate, type Row } from "@/lib/dashboard/aggregate";
import type { CallListItem } from "@/types/call";
import { formatOpenAIError } from "@/lib/openai/format-error";

/** Node may not define global `File`; avoid `instanceof File` (throws ReferenceError). */
function isUploadBlob(value: FormDataEntryValue | null): value is Exclude<FormDataEntryValue, string> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Blob).arrayBuffer === "function"
  );
}

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 24 * 1024 * 1024;

export async function GET() {
  if (!isPersistenceBackendAvailable()) {
    return NextResponse.json(
      {
        error:
          "No database configured. Add Supabase env vars (see .env.example) or run in development / set CALL_INTEL_LOCAL_STORE=true for local file storage.",
      },
      { status: 503 },
    );
  }

  if (isLocalPersistenceMode()) {
    try {
      const rows = await localListRows();
      const aggregate = buildDashboardAggregate(rows);
      const items: CallListItem[] = rows.map((r) => ({
        id: r.id,
        created_at: r.created_at,
        original_filename: r.original_filename,
        status: r.status,
        call_sentiment: r.call_insights?.call_sentiment ?? null,
        overall_score: r.call_insights?.overall_score ?? null,
        duration_seconds: r.duration_seconds,
      }));
      return NextResponse.json({
        items,
        aggregate,
        canProcessAudio: isOpenAIConfigured(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to list calls";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("calls")
      .select("*, call_insights(*)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []).map((raw) => {
      const r = raw as Row & { call_insights?: unknown };
      const nested = r.call_insights;
      const call_insights = Array.isArray(nested) ? nested[0] ?? null : nested;
      return { ...r, call_insights } as Row;
    });
    const aggregate = buildDashboardAggregate(rows);

    const items: CallListItem[] = rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      original_filename: r.original_filename,
      status: r.status,
      call_sentiment: r.call_insights?.call_sentiment ?? null,
      overall_score: r.call_insights?.overall_score ?? null,
      duration_seconds: r.duration_seconds,
    }));

    return NextResponse.json({
      items,
      aggregate,
      canProcessAudio: isOpenAIConfigured(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list calls";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isPersistenceBackendAvailable()) {
    return NextResponse.json(
      {
        error:
          "No storage available. Configure Supabase or remove CALL_INTEL_DISABLE_LOCAL_STORE (see README).",
      },
      { status: 503 },
    );
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      {
        error:
          "Missing OPENAI_API_KEY. Create a file named .env.local in the project root, add OPENAI_API_KEY=sk-..., then restart npm run dev (or npm start). See .env.example.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const entry = form.get("file");
  if (!isUploadBlob(entry)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const originalFilename =
    "name" in entry &&
    typeof (entry as { name?: string }).name === "string" &&
    (entry as { name: string }).name.length > 0
      ? (entry as { name: string }).name
      : "recording";

  if (entry.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max ~24MB for this demo)" },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await entry.arrayBuffer());
    const mimeType = entry.type || "application/octet-stream";

    const { callId } = await prepareCallUpload({
      buffer,
      originalFilename,
      mimeType,
    });

    return NextResponse.json(
      {
        id: callId,
        status: "processing" as const,
        message:
          "File saved. Call POST /api/calls/{id}/process to transcribe and analyze (the client does this next).",
      },
      { status: 202 },
    );
  } catch (e) {
    const message = formatOpenAIError(e);
    console.error("[POST /api/calls]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
