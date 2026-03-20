import { mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import type { CallInsightsRow, CallRow } from "@/types/call";
import type { Row } from "@/lib/dashboard/aggregate";

const UUID_DIR =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Set after the first successful write probe so all reads/writes use the same root. */
let resolvedLocalDataRoot: string | null = null;

function computePreferredLocalDataRoot(): string {
  const override = process.env.CALL_INTEL_LOCAL_DATA_DIR;
  if (override && override.length > 0) {
    return path.isAbsolute(override)
      ? override
      : path.join(process.cwd(), override);
  }
  return path.join(process.cwd(), ".data", "call-intelligence");
}

export function getLocalDataRoot(): string {
  return resolvedLocalDataRoot ?? computePreferredLocalDataRoot();
}

/** Ensures a writable data directory (project .data or /tmp fallback when the app user cannot write under the repo). */
export async function ensureLocalDataRootWritable(): Promise<void> {
  if (resolvedLocalDataRoot) {
    return;
  }

  async function tryWriteProbe(root: string): Promise<boolean> {
    try {
      await mkdir(path.join(root, "calls"), { recursive: true });
      const probe = path.join(root, ".write-probe");
      await writeFile(probe, "ok");
      await rm(probe);
      return true;
    } catch {
      return false;
    }
  }

  const preferred = computePreferredLocalDataRoot();
  if (await tryWriteProbe(preferred)) {
    resolvedLocalDataRoot = preferred;
    return;
  }

  const fallback = path.join(tmpdir(), "call-intelligence-platform");
  if (await tryWriteProbe(fallback)) {
    resolvedLocalDataRoot = fallback;
    console.warn(
      `[call-intelligence] ${preferred} is not writable; using ${fallback}. Fix with: chown/chmod on .data or set CALL_INTEL_LOCAL_DATA_DIR to a writable path.`,
    );
    return;
  }

  throw new Error(
    `Cannot write local call storage (tried ${preferred} and ${fallback}). Configure Supabase or set CALL_INTEL_LOCAL_DATA_DIR.`,
  );
}

function callsRoot(): string {
  return path.join(getLocalDataRoot(), "calls");
}

async function ensureCallsRoot(): Promise<void> {
  await ensureLocalDataRootWritable();
  await mkdir(callsRoot(), { recursive: true });
}

function callDir(id: string): string {
  if (!UUID_DIR.test(id)) {
    throw new Error("Invalid call id");
  }
  return path.join(callsRoot(), id);
}

export async function localWriteCallAndAudio(params: {
  call: CallRow;
  audioBuffer: Buffer;
}): Promise<void> {
  await ensureCallsRoot();
  const dir = callDir(params.call.id);
  await mkdir(dir, { recursive: true });
  const relative = params.call.audio_path;
  const fileName = path.basename(relative);
  const audioAbs = path.join(dir, fileName);
  await writeFile(audioAbs, params.audioBuffer);
  await writeFile(path.join(dir, "call.json"), JSON.stringify(params.call, null, 2), "utf8");
}

export async function localReadCall(id: string): Promise<CallRow | null> {
  if (!UUID_DIR.test(id)) {
    return null;
  }
  await ensureLocalDataRootWritable();
  const p = path.join(callDir(id), "call.json");
  try {
    const raw = await readFile(p, "utf8");
    return JSON.parse(raw) as CallRow;
  } catch {
    return null;
  }
}

export async function localUpdateCall(
  id: string,
  patch: Partial<CallRow>,
): Promise<void> {
  const existing = await localReadCall(id);
  if (!existing) {
    throw new Error("Call not found");
  }
  const next = { ...existing, ...patch };
  await writeFile(
    path.join(callDir(id), "call.json"),
    JSON.stringify(next, null, 2),
    "utf8",
  );
}

export async function localWriteInsights(row: CallInsightsRow): Promise<void> {
  await ensureLocalDataRootWritable();
  const dir = callDir(row.call_id);
  await writeFile(
    path.join(dir, "insights.json"),
    JSON.stringify(row, null, 2),
    "utf8",
  );
}

export async function localReadInsights(
  callId: string,
): Promise<CallInsightsRow | null> {
  if (!UUID_DIR.test(callId)) {
    return null;
  }
  await ensureLocalDataRootWritable();
  const p = path.join(callDir(callId), "insights.json");
  try {
    const raw = await readFile(p, "utf8");
    return JSON.parse(raw) as CallInsightsRow;
  } catch {
    return null;
  }
}

export async function localListRows(): Promise<Row[]> {
  await ensureCallsRoot();
  let names: string[];
  try {
    names = await readdir(callsRoot());
  } catch {
    return [];
  }
  const rows: Row[] = [];
  for (const name of names) {
    if (!UUID_DIR.test(name)) continue;
    const call = await localReadCall(name);
    if (!call) continue;
    const insights = await localReadInsights(name);
    rows.push({ ...call, call_insights: insights });
  }
  rows.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return rows;
}

export async function localReadAudioBuffer(call: CallRow): Promise<Buffer> {
  const abs = await localGetAudioAbsolutePath(call);
  if (!abs) {
    throw new Error("Audio file not found on disk");
  }
  return readFile(abs);
}

export async function localGetAudioAbsolutePath(
  call: CallRow,
): Promise<string | null> {
  if (!UUID_DIR.test(call.id)) {
    return null;
  }
  await ensureLocalDataRootWritable();
  const fileName = path.basename(call.audio_path);
  const abs = path.join(callDir(call.id), fileName);
  try {
    await stat(abs);
    return abs;
  } catch {
    return null;
  }
}

export async function localDeleteCallDir(id: string): Promise<void> {
  if (!UUID_DIR.test(id)) {
    return;
  }
  await ensureLocalDataRootWritable();
  const dir = callDir(id);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
