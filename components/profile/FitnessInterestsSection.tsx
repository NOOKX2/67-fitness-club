"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { clientCardInner, clientSectionLabel } from "@/lib/client-ui";
import {
  FITNESS_INTERESTS,
  MAX_FITNESS_INTERESTS,
  type FitnessInterest,
} from "@/lib/fitness-interests";
import { cn } from "@/lib/utils";

export function FitnessInterestsSection({
  initialInterests,
  onToast,
  onSaved,
}: {
  initialInterests: FitnessInterest[];
  onToast: (message: string) => void;
  onSaved?: (interests: FitnessInterest[]) => void;
}) {
  const [selected, setSelected] = useState<FitnessInterest[]>(initialInterests);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const available = useMemo(
    () => FITNESS_INTERESTS.filter((interest) => !selected.includes(interest)),
    [selected]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((interest) => interest.toLowerCase().includes(q));
  }, [available, query]);

  async function persist(next: FitnessInterest[]) {
    setSaving(true);
    try {
      const res = await api<{ fitness_interests: FitnessInterest[] }>("friends/interests", {
        method: "PUT",
        body: JSON.stringify({ interests: next }),
      });
      setSelected(res.fitness_interests);
      onSaved?.(res.fitness_interests);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not save interests");
    } finally {
      setSaving(false);
    }
  }

  async function addInterest(interest: FitnessInterest) {
    if (selected.includes(interest)) return;
    if (selected.length >= MAX_FITNESS_INTERESTS) {
      onToast("You can only select up to 3 interests.");
      return;
    }
    setPickerOpen(false);
    setQuery("");
    await persist([...selected, interest]);
  }

  async function removeInterest(interest: FitnessInterest) {
    await persist(selected.filter((item) => item !== interest));
  }

  function openPicker() {
    if (selected.length >= MAX_FITNESS_INTERESTS) {
      onToast("You can only select up to 3 interests.");
      return;
    }
    if (available.length === 0) return;
    setPickerOpen(true);
  }

  const slots = Array.from({ length: MAX_FITNESS_INTERESTS }, (_, index) => selected[index] ?? null);

  return (
    <section className="rounded-[18px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={clientSectionLabel}>Fitness Interests</p>
          <p className="mt-2 text-sm text-white/45">
            Pick up to 3 activities you care about. Shared interests unlock friend chat.
          </p>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A8C5DC]">
          {selected.length}/{MAX_FITNESS_INTERESTS} selected
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {slots.map((interest, index) =>
          interest ? (
            <div
              key={interest}
              className="flex min-h-[72px] items-center justify-between gap-2 rounded-2xl border border-[#6B93B8] bg-[#6B93B8] px-4 py-3 text-white shadow-[0_0_20px_rgba(107,147,184,0.2)]"
            >
              <p className="text-sm font-bold leading-snug">{interest}</p>
              <button
                type="button"
                disabled={saving}
                onClick={() => removeInterest(interest)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                aria-label={`Remove ${interest}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              key={`empty-${index}`}
              type="button"
              disabled={saving}
              onClick={openPicker}
              className={cn(
                clientCardInner,
                "flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border-dashed px-4 py-3 text-white/45 transition-colors hover:border-[#6B93B8]/50 hover:text-[#A8C5DC]"
              )}
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide">Add activity</span>
            </button>
          )
        )}
      </div>

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => {
            setPickerOpen(false);
            setQuery("");
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose fitness interest"
        >
          <div
            className="flex max-h-[min(80vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1520] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A8C5DC]">
                    Choose Activity
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-white">Add fitness interest</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    setQuery("");
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white/45 hover:bg-white/5 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="relative mt-4 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search activities…"
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-[#6B93B8] focus:outline-none"
                />
              </label>
            </div>

            <div className="overflow-y-auto px-3 py-3">
              {filtered.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-white/45">No activities found</p>
              ) : (
                <div className="space-y-1">
                  {filtered.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      disabled={saving}
                      onClick={() => addInterest(interest)}
                      className="flex w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-white/80 transition-colors hover:bg-[#6B93B8]/20 hover:text-white"
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
