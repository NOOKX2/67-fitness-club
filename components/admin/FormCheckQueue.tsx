"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import type { FormCheckSubmission } from "@/lib/data";
import { formCheckVideoStreamPath } from "@/lib/form-check-constants";

export function FormCheckQueue({
  submissions,
}: {
  submissions: FormCheckSubmission[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

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
      setMessages((m) => ({ ...m, [id]: "Feedback saved" }));
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
          Video Form-Check Queue
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review and provide feedback on Tier 3 client form submissions
        </p>
      </div>

      <div className="border border-zinc-800">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="font-medium text-white">No pending form checks</p>
            <p className="mt-1 text-sm text-zinc-500">
              Tier 3 client submissions will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {submissions.map((s) => (
              <div key={s.id} className="px-6 py-5">
                <p className="font-semibold text-white">
                  {s.user_name ?? "Client"} — {s.exercise_name ?? "Exercise"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Submitted {s.submitted_at?.slice(0, 10) ?? "—"}
                </p>
                {s.video_file_id || s.video_base64 ? (
                  <video
                    src={formCheckVideoStreamPath(s.id)}
                    controls
                    playsInline
                    preload="metadata"
                    className="mt-4 max-h-64 w-full max-w-md rounded-lg bg-black"
                  />
                ) : (
                  <p className="mt-4 text-sm text-amber-400">
                    Video unavailable — client may need to re-upload
                  </p>
                )}
                <div className="mt-4 max-w-xl space-y-3">
                  <div>
                    <FieldLabel>Coach Feedback</FieldLabel>
                    <textarea
                      value={feedback[s.id] ?? ""}
                      onChange={(e) =>
                        setFeedback((f) => ({ ...f, [s.id]: e.target.value }))
                      }
                      rows={3}
                      placeholder="Write feedback for this form check..."
                      className="w-full resize-none border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                  <Button
                    type="button"
                    className="h-10 gap-2 bg-[#6B93B8] text-xs text-white"
                    onClick={() => saveFeedback(s.id)}
                    disabled={savingId === s.id}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingId === s.id ? "Saving…" : "Save Feedback"}
                  </Button>
                  {messages[s.id] && (
                    <p
                      className={`text-sm ${
                        messages[s.id] === "Feedback saved"
                          ? "text-[#6B93B8]"
                          : "text-red-400"
                      }`}
                    >
                      {messages[s.id]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
