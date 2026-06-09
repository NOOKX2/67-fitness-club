import {
  expiryCountdownLabel,
  genderLabel,
  getAccessStatus,
  normalizeDateOnly,
} from "@/lib/access";

export { expiryCountdownLabel };

export function formatDateOnly(value?: string | null): string {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return "—";
  const d = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear() + 543;
  return `${day}/${month}/${year}`;
}

export function accessStatusLabel(client: {
  role?: string;
  access_starts_at?: string | null;
  access_expires_at?: string | null;
}): { label: string; className: string } {
  const status = getAccessStatus(client);
  if (status === "active") {
    return { label: "Active", className: "text-[#6B93B8]" };
  }
  if (status === "expired") {
    return { label: "Expired", className: "text-red-400" };
  }
  return { label: "Not started", className: "text-amber-400" };
}

export { genderLabel };

export function formatJoinedDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

export function tierBadgeClass(tier: string): string {
  if (tier === "Tier 3") return "bg-amber-400/20 text-amber-300 border-amber-400/40";
  if (tier === "Tier 2") return "bg-sky-400/20 text-sky-300 border-sky-400/40";
  return "bg-zinc-700/50 text-zinc-300 border-zinc-600";
}
