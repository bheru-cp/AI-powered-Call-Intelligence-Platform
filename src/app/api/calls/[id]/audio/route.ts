import { readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import { isLocalPersistenceMode } from "@/lib/persistence/config";
import {
  localGetAudioAbsolutePath,
  localReadCall,
} from "@/lib/persistence/local-calls-store";
import { guessAudioMimeType } from "@/lib/guess-audio-mime";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  if (!isLocalPersistenceMode()) {
    return NextResponse.json(
      { error: "Audio is only served from local disk in dev/local-store mode." },
      { status: 404 },
    );
  }

  const { id } = await context.params;
  const call = await localReadCall(id);
  if (!call) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const abs = await localGetAudioAbsolutePath(call);
  if (!abs) {
    return NextResponse.json({ error: "Audio file missing" }, { status: 404 });
  }

  try {
    const s = await stat(abs);
    const body = await readFile(abs);
    const mime = guessAudioMimeType(call.original_filename);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(s.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to read audio" }, { status: 500 });
  }
}
