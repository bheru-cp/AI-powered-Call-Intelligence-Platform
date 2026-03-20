/** Whisper is picky about type; derive from filename when the browser sends empty/octet-stream. */
export function resolveAudioMimeType(filename: string, mimeType: string): string {
  const t = mimeType.trim().toLowerCase();
  if (t && t !== "application/octet-stream") {
    // Browsers / OSes often report WAV as audio/wave, audio/x-wav, etc. — normalize for the API.
    if (
      t === "audio/x-wav" ||
      t === "audio/wave" ||
      t === "audio/vnd.wave" ||
      t === "audio/vnd.wav"
    ) {
      return "audio/wav";
    }
    return mimeType;
  }
  const lower = filename.toLowerCase();
  if (lower.endsWith(".wav") || lower.endsWith(".wave")) return "audio/wav";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".ogg") || lower.endsWith(".oga")) return "audio/ogg";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".opus")) return "audio/opus";
  if (lower.endsWith(".aac")) return "audio/aac";
  return "application/octet-stream";
}
