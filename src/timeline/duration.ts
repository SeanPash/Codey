// Human duration: "45s", "3m 12s", "1h 04m". Sub-second rounds up to "1s" so a real action
// never reads as "0s". Used by the status line; the browser page has a matching JS twin.
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  if (total < 60) return `${total || 1}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${String(rm).padStart(2, "0")}m`;
}
