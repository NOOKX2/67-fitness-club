"use client";

import { RunningIcon } from "@/components/icons/RunningIcon";
import { FieldLabel, Input } from "@/components/ui/Input";

export function CardioEditor({
  minutes,
  km,
  notes,
  onMinutesChange,
  onKmChange,
  onNotesChange,
}: {
  minutes: string;
  km: string;
  notes: string;
  onMinutesChange: (value: string) => void;
  onKmChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}) {
  return (
    <div className="mt-8 border-t border-zinc-800 pt-6">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        <RunningIcon className="h-4 w-4" />
        Cardio
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Optional cardio assignment shown at the bottom of the client training
        program.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Duration (minutes)</FieldLabel>
          <Input
            type="number"
            min={0}
            placeholder="30"
            value={minutes}
            onChange={(e) => onMinutesChange(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Distance (km)</FieldLabel>
          <Input
            type="number"
            min={0}
            step="0.1"
            placeholder="5"
            value={km}
            onChange={(e) => onKmChange(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4">
        <FieldLabel>Notes (optional)</FieldLabel>
        <Input
          placeholder="e.g. Treadmill, moderate pace"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
    </div>
  );
}
