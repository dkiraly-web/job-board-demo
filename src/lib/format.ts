export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatLocation(location: {
  fullLocation?: string;
  remote?: boolean;
  hybrid?: boolean;
}): string {
  const base = location.fullLocation ?? "Location not specified";
  if (location.remote) return `${base} · Remote`;
  if (location.hybrid) return `${base} · Hybrid`;
  return base;
}
