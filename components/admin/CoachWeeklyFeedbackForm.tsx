"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import type { WeeklyReport } from "@/lib/data";
import { clientWeekSelect } from "@/lib/client-ui";

const WEEK_OPTIONS = [1, 2, 3, 4];

export function CoachWeeklyFeedbackForm({ clientId }: { clientId: string }) {
  const [week, setWeek] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api<WeeklyReport[]>(`admin/weekly-reports?user_id=${clientId}`)
      .then((data) => setReports(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load reports")
      )
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    const existing = reports.find((report) => report.week_number === week);
    setFeedback(existing?.report_text ?? "");
  }, [week, reports]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await api<{ message: string; report: WeeklyReport }>("admin/weekly-reports", {
        method: "POST",
        body: JSON.stringify({
          user_id: clientId,
          week_number: week,
          report_text: feedback.trim(),
        }),
      });
      setReports((prev) => {
        const next = prev.filter((report) => report.week_number !== week);
        return [res.report, ...next].sort((a, b) => b.week_number - a.week_number);
      });
      setMessage(`Week ${week} feedback saved`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="border-b border-zinc-800 bg-zinc-950/80 px-5 py-4"
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#6B93B8]">
        Weekly Feedback
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-36">
          <FieldLabel>Week</FieldLabel>
          <select
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            className={clientWeekSelect}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B93B8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            }}
          >
            {WEEK_OPTIONS.map((w) => (
              <option key={w} value={w} className="bg-zinc-900">
                Week {w}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <FieldLabel>Coach Feedback</FieldLabel>
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write weekly feedback for this client..."
            className="w-full resize-none rounded-xl border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#6B93B8] focus:outline-none"
          />
        </div>
        <Button type="submit" disabled={saving || loading || !feedback.trim()}>
          {saving ? "Saving…" : "Save Report"}
        </Button>
      </div>
      {loading && <p className="mt-2 text-xs text-zinc-500">Loading reports…</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {message && <p className="mt-2 text-xs text-[#6B93B8]">{message}</p>}
    </form>
  );
}
