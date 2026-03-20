export function guessAudioMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav") || lower.endsWith(".wave")) return "audio/wav";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".ogg") || lower.endsWith(".oga")) return "audio/ogg";
  if (lower.endsWith(".flac")) return "audio/flac";
  return "application/octet-stream";
}
