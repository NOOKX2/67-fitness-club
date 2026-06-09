import { isAdminRole } from "./routes";

export type Gender = "male" | "female" | "prefer_not_to_say";

export type AccessStatus = "active" | "expired" | "not_started";

export function genderLabel(gender?: string | null): string {
  const map: Record<string, string> = {
    male: "Male",
    female: "Female",
    prefer_not_to_say: "Prefer not to say",
  };
  return map[gender ?? ""] ?? "—";
}

export function normalizeDateOnly(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function startOfDay(isoDate: string): Date {
  const normalized = normalizeDateOnly(isoDate) ?? isoDate;
  const d = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return new Date(isoDate);
  return d;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/** Calendar days from today (UTC) until target date, inclusive of expiry day. */
export function daysUntilDate(isoDate: string): number {
  const target = startOfDay(isoDate);
  const today = todayUtc();
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function endOfDay(isoDate: string): Date {
  const d = new Date(`${isoDate}T23:59:59.999Z`);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date(isoDate);
    fallback.setUTCHours(23, 59, 59, 999);
    return fallback;
  }
  return d;
}

export function getAccessStatus(user: {
  role?: string;
  access_starts_at?: string | null;
  access_expires_at?: string | null;
}): AccessStatus {
  if (isAdminRole(user.role ?? "")) return "active";
  const now = new Date();
  if (user.access_starts_at) {
    if (now < startOfDay(user.access_starts_at)) return "not_started";
  }
  if (user.access_expires_at) {
    if (now > endOfDay(user.access_expires_at)) return "expired";
  }
  return "active";
}

export function checkUserAccess(user: {
  role?: string;
  access_starts_at?: string | null;
  access_expires_at?: string | null;
}): { active: boolean; status: AccessStatus; message?: string } {
  const status = getAccessStatus(user);
  if (status === "expired") {
    return {
      active: false,
      status,
      message: "Your account has expired. Please contact your coach.",
    };
  }
  if (status === "not_started") {
    return {
      active: false,
      status,
      message: "Your account is not active yet. Please contact your coach.",
    };
  }
  return { active: true, status };
}

export function expiryCountdownLabel(client: {
  role?: string;
  access_starts_at?: string | null;
  access_expires_at?: string | null;
}): { text: string; className: string } {
  const expiresAt = normalizeDateOnly(client.access_expires_at);
  if (!expiresAt) {
    return { text: "No expiry", className: "text-zinc-500" };
  }

  const status = getAccessStatus(client);
  if (status === "expired") {
    return { text: "Expired", className: "text-red-400" };
  }

  const days = daysUntilDate(expiresAt);
  if (days === 0) {
    return { text: "Expires today", className: "text-amber-400" };
  }
  if (days === 1) {
    return { text: "1 day left", className: "text-amber-400" };
  }
  if (days <= 7) {
    return { text: `${days} days left`, className: "text-amber-400" };
  }
  return { text: `${days} days left`, className: "text-[#6B93B8]" };
}

export function validateAccessDates(
  startsAt?: string | null,
  expiresAt?: string | null
): string | null {
  if (startsAt && expiresAt && endOfDay(expiresAt) < startOfDay(startsAt)) {
    return "Expiry date must be on or after start date";
  }
  return null;
}
