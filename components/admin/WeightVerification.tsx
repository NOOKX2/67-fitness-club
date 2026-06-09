"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { formatLiftAmount } from "@/lib/lift-utils";
import type { PendingLift } from "@/lib/data";

export function WeightVerification({ lifts }: { lifts: PendingLift[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function verify(id: string) {
    try {
      await api(`admin/lift-progress/${id}/verify`, { method: "POST" });
      setMessages((m) => ({ ...m, [id]: "Approved and saved" }));
      router.refresh();
    } catch (err) {
      setMessages((m) => ({
        ...m,
        [id]: err instanceof Error ? err.message : "Save failed",
      }));
    }
  }

  async function reject(id: string) {
    try {
      await api(`admin/lift-progress/${id}/reject`, { method: "POST" });
      setMessages((m) => ({ ...m, [id]: "Rejected and saved" }));
      router.refresh();
    } catch (err) {
      setMessages((m) => ({
        ...m,
        [id]: err instanceof Error ? err.message : "Save failed",
      }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-white">
          <Trophy className="h-6 w-6 text-[#6B93B8]" />
          Weight Verification Queue
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review and approve client PR submissions
        </p>
      </div>

      <div className="border border-zinc-800">
        {lifts.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700">
              <Check className="h-8 w-8 text-zinc-600" />
            </div>
            <p className="font-medium text-white">All caught up!</p>
            <p className="mt-1 text-sm text-zinc-500">
              No pending verifications at the moment
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {lifts.map((lift) => (
              <div
                key={lift.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-5"
              >
                <div>
                  <p className="font-semibold text-white">{lift.user_name}</p>
                  <p className="text-sm text-zinc-500">{lift.user_email}</p>
                  <p className="mt-2 text-sm text-white">
                    {lift.exercise_name} —{" "}
                    <span className="text-[#6B93B8]">
                      {formatLiftAmount(lift.exercise_name, lift.weight_lifted)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {messages[lift.id] && (
                    <p
                      className={`text-xs ${
                        messages[lift.id].includes("saved")
                          ? "text-[#6B93B8]"
                          : "text-red-400"
                      }`}
                    >
                      {messages[lift.id]}
                    </p>
                  )}
                  <div className="flex gap-2">
                  <Button
                    type="button"
                    className="h-9 gap-1 bg-[#6B93B8] text-xs text-white"
                    onClick={() => verify(lift.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1 text-xs text-red-400"
                    onClick={() => reject(lift.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
