export function formatEl(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("el-GR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function formatM2(n: number, digits = 0): string {
  return `${formatEl(n, digits)} μ²`;
}

export function formatM(n: number, digits = 1): string {
  return `${formatEl(n, digits)} μ.`;
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPct(n: number): string {
  return `${formatEl(n * 100, 0)}%`;
}

export function formatBeds(n: number): string {
  if (n <= 0) return "Studio";
  return `${n}Υ`;
}

export function formatRooms(kinds: string[]): string {
  const counts = new Map<string, number>();
  for (const k of kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
  const parts: string[] = [];
  const order = ["living", "kitchen", "bed", "bath", "storage", "shop"] as const;
  const names: Record<string, [string, string]> = {
    living: ["σαλόνι", "σαλόνι"],
    kitchen: ["κουζίνα", "κουζίνες"],
    bed: ["υπνοδ.", "υπνοδ."],
    bath: ["μπάνιο", "μπάνια"],
    storage: ["αποθήκη", "αποθήκες"],
    shop: ["κατάστημα", "καταστήματα"],
  };
  for (const k of order) {
    const n = counts.get(k);
    if (!n) continue;
    const [one, many] = names[k];
    parts.push(n === 1 ? one : `${n} ${many}`);
  }
  return parts.join(" · ");
}

export function formatSavedAt(ts: number): string {
  return new Intl.DateTimeFormat("el-GR", {
    day: "numeric",
    month: "short",
  }).format(new Date(ts));
}
