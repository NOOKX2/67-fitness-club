"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, User, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import type { AdminClient, FormCheckSubmission, WorkoutLog } from "@/lib/data";
import { formatWorkoutLogSummary } from "@/lib/workout-log-utils";
import { formCheckVideoStreamPath } from "@/lib/form-check-constants";

export function ClientResults({
  clients,
  selectedClientId,
  week,
  day,
  logs,
  formChecks,
}: {
  clients: AdminClient[];
  selectedClientId: string;
  week: number;
  day: number;
  logs: WorkoutLog[];
  formChecks: FormCheckSubmission[];
}) {
  const router = useRouter();
  const selected = clients.find((c) => c.id === selectedClientId);
  const [feedback, setFeedback] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const fc of formChecks) {
      if (fc.feedback_text) initial[fc.id] = fc.feedback_text;
    }
    return initial;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  function navigate(clientId: string, w: number, d: number) {
    const params = new URLSearchParams();
    if (clientId) params.set("client", clientId);
    params.set("week", String(w));
    params.set("day", String(d));
    router.push(`/admin/results?${params.toString()}`);
  }

  async function saveFeedback(id: string) {
    const text = feedback[id]?.trim();
    if (!text) {
      setMessages((m) => ({ ...m, [id]: "Please enter feedback before saving" }));
      return;
    }
    setSavingId(id);
    setMessages((m) => ({ ...m, [id]: "" }));
    try {
      await api(`admin/form-checks/${id}/feedback`, {
        method: "POST",
        body: JSON.stringify({ feedback_text: text }),
      });
      setMessages((m) => ({
        ...m,
        [id]: "Feedback saved and sent to client chat",
      }));
      router.refresh();
    } catch (err) {
      setMessages((m) => ({
        ...m,
        [id]: err instanceof Error ? err.message : "Save failed",
      }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-white">
          Client Results
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track client progress, workout logs, and form-check videos
        </p>
      </div>

      <div className="border border-zinc-800 p-6">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          <User className="h-4 w-4" />
          Select Client
        </div>
        <select
          value={selectedClientId}
          onChange={(e) => navigate(e.target.value, week, day)}
          className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
        >
          <option value="">Choose a client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.email}) - {c.tier_level}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="space-y-6">
          <div className="border border-zinc-800 p-6">
            <div className="mb-6 grid max-w-md grid-cols-2 gap-4">
              <div>
                <FieldLabel>Week</FieldLabel>
                <select
                  value={week}
                  onChange={(e) =>
                    navigate(selectedClientId, Number(e.target.value), day)
                  }
                  className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
                >
                  {[1, 2, 3, 4].map((w) => (
                    <option key={w} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Day</FieldLabel>
                <select
                  value={day}
                  onChange={(e) =>
                    navigate(selectedClientId, week, Number(e.target.value))
                  }
                  className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="mb-4 text-sm font-bold uppercase text-white">
              Workout Logs — {selected.name}
            </h2>

            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                No workout logs for Week {week}, Day {day}
              </p>
            ) : (
              <div className="divide-y divide-zinc-800 border border-zinc-800">
                {logs.map((log, index) => (
                  <div
                    key={log.id ?? `${log.exercise_id}-${index}`}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <span className="font-medium uppercase text-white">
                      {log.exercise_name ?? "Unknown exercise"}
                    </span>
                    <span className="max-w-[55%] text-right text-white">
                      {formatWorkoutLogSummary(log)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-zinc-800 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Video className="h-5 w-5 text-[#6B93B8]" />
              <h2 className="text-sm font-bold uppercase text-white">
                Form Check Videos — Week {week}, Day {day}
              </h2>
            </div>

            {formChecks.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                No form check videos for this week and day
              </p>
            ) : (
              <div className="space-y-6">
                {formChecks.map((fc) => (
                  <div
                    key={fc.id}
                    className="border border-zinc-800 bg-zinc-950/50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold uppercase text-white">
                          {fc.exercise_name ?? "Exercise"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Submitted {fc.submitted_at?.slice(0, 16).replace("T", " ") ?? "—"}
                          {" · "}
                          <span
                            className={
                              fc.status === "reviewed"
                                ? "text-[#6B93B8]"
                                : "text-amber-400"
                            }
                          >
                            {fc.status === "reviewed" ? "Reviewed" : "Pending review"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {fc.video_file_id || fc.video_base64 ? (
                      <video
                        src={formCheckVideoStreamPath(fc.id)}
                        controls
                        playsInline
                        preload="metadata"
                        className="mt-4 max-h-72 w-full max-w-lg rounded-lg bg-black"
                      />
                    ) : (
                      <p className="mt-4 text-sm text-amber-400">
                        Video unavailable — ask the client to re-upload this form check
                      </p>
                    )}

                    <div className="mt-4 max-w-xl space-y-3">
                      <div>
                        <FieldLabel>Coach Feedback (sent to client chat)</FieldLabel>
                        <textarea
                          value={feedback[fc.id] ?? ""}
                          onChange={(e) =>
                            setFeedback((f) => ({ ...f, [fc.id]: e.target.value }))
                          }
                          rows={3}
                          placeholder="Write form check notes for the client..."
                          className="w-full resize-none border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#6B93B8] focus:outline-none"
                        />
                      </div>
                      <Button
                        type="button"
                        className="h-10 gap-2 bg-[#6B93B8] text-xs text-white"
                        onClick={() => saveFeedback(fc.id)}
                        disabled={savingId === fc.id}
                      >
                        <Save className="h-3.5 w-3.5" />
                        {savingId === fc.id ? "Saving…" : "Save & Send to Chat"}
                      </Button>
                      {messages[fc.id] && (
                        <p
                          className={`text-sm ${
                            messages[fc.id].includes("sent")
                              ? "text-[#6B93B8]"
                              : "text-red-400"
                          }`}
                        >
                          {messages[fc.id]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
