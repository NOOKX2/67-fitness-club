"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import type { AdminClient, MealSubmission } from "@/lib/data";
import {
  coachRatingStyle,
  formatMealMacros,
  mealDisplayName,
} from "@/lib/nutrition-utils";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "./admin-utils";

export function NutritionReview({
  clients,
  selectedClientId,
  date,
  meals,
}: {
  clients: AdminClient[];
  selectedClientId: string;
  date: string;
  meals: MealSubmission[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [macros, setMacros] = useState<
    Record<string, { protein: string; carbs: string; fat: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const selected = clients.find((c) => c.id === selectedClientId);

  async function saveReview(mealId: string) {
    const rating = ratings[mealId];
    if (!rating) {
      setMessages((m) => ({ ...m, [mealId]: "Please select a score (1–5)" }));
      return;
    }
    setSavingId(mealId);
    setMessages((m) => ({ ...m, [mealId]: "" }));
    try {
      await api(`admin/nutrition-submissions/${mealId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          feedback: feedback[mealId] ?? "",
          protein: macros[mealId]?.protein
            ? Number(macros[mealId].protein)
            : undefined,
          carbs: macros[mealId]?.carbs ? Number(macros[mealId].carbs) : undefined,
          fat: macros[mealId]?.fat ? Number(macros[mealId].fat) : undefined,
        }),
      });
      setMessages((m) => ({ ...m, [mealId]: "Review saved" }));
      router.refresh();
    } catch (err) {
      setMessages((m) => ({
        ...m,
        [mealId]: err instanceof Error ? err.message : "Save failed",
      }));
    } finally {
      setSavingId(null);
    }
  }

  function navigate(clientEmail: string, nextDate: string) {
    const params = new URLSearchParams();
    if (clientEmail) params.set("client", clientEmail);
    params.set("date", nextDate);
    router.push(`/admin/nutrition?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-white">
          <Apple className="h-6 w-6 text-[#6B93B8]" />
          Nutrition Review
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Review client nutrition intake</p>
      </div>

      <div className="grid gap-4 border border-zinc-800 p-6 sm:grid-cols-2">
        <div>
          <FieldLabel>Select Client</FieldLabel>
          <select
            value={selected?.email ?? ""}
            onChange={(e) => navigate(e.target.value, date)}
            className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
          >
            <option value="">Choose a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.email}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Select Date</FieldLabel>
          <input
            type="date"
            value={date}
            onChange={(e) => navigate(selected?.email ?? "", e.target.value)}
            className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
          />
        </div>
      </div>

      {selected && (
        <>
          <div className="flex items-center justify-between border border-zinc-800 bg-zinc-950 p-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Viewing nutrition for
              </p>
              <p className="mt-1 text-2xl font-bold text-white">{selected.name}</p>
              <p className="text-sm text-zinc-500">{selected.email}</p>
              <p className="text-sm text-zinc-600">{formatDateOnly(date)}</p>
            </div>
            <div className="border border-zinc-800 px-6 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Total Meals
              </p>
              <p className="mt-1 text-3xl font-bold text-[#6B93B8]">{meals.length}</p>
            </div>
          </div>

          <div className="border border-zinc-800">
            {meals.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <Apple className="mb-4 h-16 w-16 stroke-1 text-zinc-700" />
                <p className="font-medium text-white">No meals logged for this date</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {selected.name} hasn&apos;t logged any meals on {formatDateOnly(date)}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {meals.map((m) => (
                  <li key={m.id} className="px-6 py-4">
                    <div className="flex gap-4">
                      {m.photo_base64 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.photo_base64}
                          alt=""
                          className="h-20 w-20 object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold uppercase text-white">
                          {mealDisplayName(m)}
                        </p>
                        {m.description && (
                          <p className="mt-1 text-sm text-zinc-400">{m.description}</p>
                        )}
                        {m.weight && (
                          <p className="mt-1 text-xs text-zinc-500">{m.weight} g</p>
                        )}
                        <p className="mt-1 text-xs text-zinc-500">
                          {m.coach_reviewed ? "Reviewed" : "Pending review"}
                        </p>
                        {m.coach_reviewed && m.coach_rating && (
                          <p
                            className={`mt-2 text-sm font-semibold ${
                              coachRatingStyle(m.coach_rating).className
                            }`}
                          >
                            Score {m.coach_rating}/5 —{" "}
                            {coachRatingStyle(m.coach_rating).label}
                          </p>
                        )}
                        {m.coach_reviewed && formatMealMacros(m) && (
                          <p className="mt-1 text-sm text-zinc-400">
                            {formatMealMacros(m)}
                          </p>
                        )}
                        {m.coach_reviewed && m.coach_feedback && (
                          <p className="mt-1 text-sm text-zinc-300">
                            Coach: {m.coach_feedback}
                          </p>
                        )}
                      </div>
                    </div>
                    {!m.coach_reviewed && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <FieldLabel>Score (5 = best, 1 = poor)</FieldLabel>
                          <div className="mt-2 flex gap-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() =>
                                  setRatings((r) => ({ ...r, [m.id]: score }))
                                }
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center border text-sm font-bold transition-colors",
                                  ratings[m.id] === score
                                    ? "border-[#6B93B8] bg-[#6B93B8] text-white"
                                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                                )}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Macros (grams)</FieldLabel>
                          <div className="mt-2 grid grid-cols-3 gap-3">
                            <div>
                              <FieldLabel>Protein</FieldLabel>
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={macros[m.id]?.protein ?? ""}
                                onChange={(e) =>
                                  setMacros((prev) => ({
                                    ...prev,
                                    [m.id]: {
                                      protein: e.target.value,
                                      carbs: prev[m.id]?.carbs ?? "",
                                      fat: prev[m.id]?.fat ?? "",
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <FieldLabel>Carb</FieldLabel>
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={macros[m.id]?.carbs ?? ""}
                                onChange={(e) =>
                                  setMacros((prev) => ({
                                    ...prev,
                                    [m.id]: {
                                      protein: prev[m.id]?.protein ?? "",
                                      carbs: e.target.value,
                                      fat: prev[m.id]?.fat ?? "",
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <FieldLabel>Fat</FieldLabel>
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={macros[m.id]?.fat ?? ""}
                                onChange={(e) =>
                                  setMacros((prev) => ({
                                    ...prev,
                                    [m.id]: {
                                      protein: prev[m.id]?.protein ?? "",
                                      carbs: prev[m.id]?.carbs ?? "",
                                      fat: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Coach Feedback (optional)</FieldLabel>
                          <textarea
                            value={feedback[m.id] ?? ""}
                            onChange={(e) =>
                              setFeedback((f) => ({ ...f, [m.id]: e.target.value }))
                            }
                            rows={2}
                            placeholder="Add notes for the client..."
                            className="w-full resize-none border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                          />
                        </div>
                        <Button
                          type="button"
                          className="h-9 gap-2 bg-[#6B93B8] text-xs text-white"
                          onClick={() => saveReview(m.id)}
                          disabled={savingId === m.id}
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingId === m.id ? "Saving…" : "Save Review"}
                        </Button>
                        {messages[m.id] && (
                          <p
                            className={`text-sm ${
                              messages[m.id] === "Review saved"
                                ? "text-[#6B93B8]"
                                : "text-red-400"
                            }`}
                          >
                            {messages[m.id]}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
