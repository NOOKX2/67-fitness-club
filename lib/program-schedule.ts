import { normalizeDateOnly } from "./access";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_WEEK = 4;
const DAYS_PER_WEEK = 7;

function utcDayStart(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }
  const normalized = normalizeDateOnly(value) ?? value;
  return new Date(`${normalized}T00:00:00.000Z`);
}

function utcToday(referenceDate = new Date()): Date {
  return new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
}

/** Days elapsed since program start, where start day = 1. */
export function getProgramDayNumber(
  programStartDate: string,
  referenceDate = new Date()
): number {
  const start = utcDayStart(programStartDate);
  const today = utcToday(referenceDate);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / MS_PER_DAY);
  return Math.max(1, diffDays + 1);
}

export function getProgramWeekDay(
  programStartDate: string,
  referenceDate = new Date()
): { week: number; day: number } {
  const programDay = getProgramDayNumber(programStartDate, referenceDate);
  const cappedDay = Math.min(MAX_WEEK * DAYS_PER_WEEK, programDay);
  const week = Math.min(MAX_WEEK, Math.floor((cappedDay - 1) / DAYS_PER_WEEK) + 1);
  const day = ((cappedDay - 1) % DAYS_PER_WEEK) + 1;
  return { week, day };
}

export function resolveProgramStartDate(user: {
  access_starts_at?: string | null;
  created_at?: string | null;
}): string {
  return (
    normalizeDateOnly(user.access_starts_at) ??
    normalizeDateOnly(user.created_at) ??
    utcToday().toISOString().slice(0, 10)
  );
}
