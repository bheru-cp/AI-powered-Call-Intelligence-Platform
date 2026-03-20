export function formatDurationSeconds(total: number | null | undefined): string {
  if (total == null || !Number.isFinite(total)) {
    return "—";
  }
  const s = Math.round(total);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

export function formatScore(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}
