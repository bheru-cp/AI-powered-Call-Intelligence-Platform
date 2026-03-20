import "@/lib/openai/node-file-polyfill";
import { toFile } from "openai";
import { getOpenAI } from "@/lib/openai/client";
import { formatOpenAIError } from "@/lib/openai/format-error";
import { resolveAudioMimeType } from "@/lib/openai/resolve-audio-mime";

export async function transcribeAudioBuffer(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<{ text: string; durationSeconds: number | null }> {
  const openai = getOpenAI();
  const type = resolveAudioMimeType(params.filename, params.mimeType);
  const file = await toFile(params.buffer, params.filename, {
    type,
  });

  try {
    // Use verbose_json so we can persist duration for dashboard metrics.
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
    });
    const text = result.text ?? "";
    const durationSeconds =
      typeof result.duration === "number" && Number.isFinite(result.duration)
        ? result.duration
        : null;
    return { text, durationSeconds };
  } catch (err) {
    // Fallback to plain json for compatibility if verbose_json is unavailable.
    try {
      const file2 = await toFile(params.buffer, params.filename, { type });
      const fallback = await openai.audio.transcriptions.create({
        file: file2,
        model: "whisper-1",
        response_format: "json",
      });
      const text = fallback.text ?? "";
      return { text, durationSeconds: null };
    } catch (err2) {
      throw new Error(
        `Whisper transcription failed: ${formatOpenAIError(err)}. Fallback: ${formatOpenAIError(err2)}`,
      );
    }
  }
}
