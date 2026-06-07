"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function AddFriendModal({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function sendRequest() {
    setSending(true);
    setError("");
    try {
      const res = await api<{ message: string; auto_accepted?: boolean }>("friends/request", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmail("");
      onSent(res.message);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add friend"
    >
      <div
        className={cn(
          "w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d1520] shadow-2xl"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A8C5DC]">
              Connect
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">Add Friend</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/45 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <FieldLabel>Enter Friend&apos;s Email Address</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@email.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendRequest();
              }}
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 bg-[#6B93B8] text-sm font-bold uppercase tracking-wide text-white hover:bg-[#5a82a7]"
            onClick={sendRequest}
            disabled={sending || !email.trim()}
          >
            <UserPlus className="h-4 w-4" />
            {sending ? "Sending…" : "Send Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AddFriendButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl bg-[#6B93B8] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#5a82a7]"
    >
      <UserPlus className="h-3.5 w-3.5" />
      Add Friend
    </button>
  );
}
