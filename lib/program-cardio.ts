export type ProgramCardio = {
  duration_minutes?: number | null;
  distance_km?: number | null;
  notes?: string;
};

export function normalizeProgramCardio(raw: unknown): ProgramCardio | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const duration =
    o.duration_minutes != null && o.duration_minutes !== ""
      ? Number(o.duration_minutes)
      : null;
  const distance =
    o.distance_km != null && o.distance_km !== ""
      ? Number(o.distance_km)
      : null;
  const notes = typeof o.notes === "string" ? o.notes.trim() : "";
  const hasDuration =
    duration != null && Number.isFinite(duration) && duration > 0;
  const hasDistance =
    distance != null && Number.isFinite(distance) && distance > 0;
  if (!hasDuration && !hasDistance && !notes) return null;
  return {
    duration_minutes: hasDuration ? duration : null,
    distance_km: hasDistance ? distance : null,
    notes: notes || undefined,
  };
}

export function formatProgramCardio(cardio: ProgramCardio): string {
  const parts: string[] = [];
  if (cardio.duration_minutes) parts.push(`${cardio.duration_minutes} min`);
  if (cardio.distance_km) parts.push(`${cardio.distance_km} km`);
  if (cardio.notes) parts.push(cardio.notes);
  return parts.join(" · ");
}

export function cardioToFormState(cardio: ProgramCardio | null | undefined) {
  return {
    minutes:
      cardio?.duration_minutes != null ? String(cardio.duration_minutes) : "",
    km: cardio?.distance_km != null ? String(cardio.distance_km) : "",
    notes: cardio?.notes ?? "",
  };
}

export function formStateToCardio(state: {
  minutes: string;
  km: string;
  notes: string;
}): ProgramCardio | null {
  return normalizeProgramCardio({
    duration_minutes: state.minutes.trim() ? state.minutes : null,
    distance_km: state.km.trim() ? state.km : null,
    notes: state.notes,
  });
}
