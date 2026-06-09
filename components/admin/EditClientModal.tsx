"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import type { AdminClient } from "@/lib/data";
import { normalizeDateOnly, type Gender } from "@/lib/access";

const TIER_OPTIONS = [
  { value: "Tier 1", label: "Tier 1 - The Engine" },
  { value: "Tier 2", label: "Tier 2 - The Builder" },
  { value: "Tier 3", label: "Tier 3 - VIP" },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function EditClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: AdminClient;
  onClose: () => void;
  onSaved: (client: AdminClient) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: client.name,
    tier_level: client.tier_level,
    gender: (client.gender as Gender) || "prefer_not_to_say",
    access_starts_at: normalizeDateOnly(client.access_starts_at) ?? "",
    access_expires_at: normalizeDateOnly(client.access_expires_at) ?? "",
    tdee: client.tdee != null ? String(client.tdee) : "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await api<{
        message: string;
        client: AdminClient | null;
      }>(`admin/clients/${client.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name.trim(),
          tier_level: form.tier_level,
          gender: form.gender,
          access_starts_at: form.access_starts_at || null,
          access_expires_at: form.access_expires_at || null,
          tdee: form.tdee ? Number(form.tdee) : null,
        }),
      });
      const updated: AdminClient = res.client ?? {
        ...client,
        name: form.name.trim(),
        tier_level: form.tier_level,
        gender: form.gender,
        access_starts_at: form.access_starts_at || null,
        access_expires_at: form.access_expires_at || null,
        tdee: form.tdee ? Number(form.tdee) : null,
      };
      onSaved(updated);
      setMessage("Client updated");
      router.refresh();
      setTimeout(onClose, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-zinc-700 bg-zinc-950 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wide text-white">
              Edit Client
            </h2>
            <p className="mt-1 text-xs text-zinc-500">{client.email}</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <FieldLabel>Gender</FieldLabel>
            <select
              value={form.gender}
              onChange={(e) =>
                setForm({ ...form, gender: e.target.value as Gender })
              }
              className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
            >
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Tier Level</FieldLabel>
            <select
              value={form.tier_level}
              onChange={(e) => setForm({ ...form, tier_level: e.target.value })}
              className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>TDEE (kcal / day)</FieldLabel>
            <Input
              type="number"
              min={1}
              value={form.tdee}
              onChange={(e) => setForm({ ...form, tdee: e.target.value })}
              placeholder="e.g. 2200"
            />
            <p className="mt-1 text-[10px] text-zinc-600">
              Daily maintenance calories — used on the Progress page
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Access Starts</FieldLabel>
              <Input
                type="date"
                value={form.access_starts_at}
                onChange={(e) =>
                  setForm({ ...form, access_starts_at: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel>Access Expires</FieldLabel>
              <Input
                type="date"
                value={form.access_expires_at}
                onChange={(e) =>
                  setForm({ ...form, access_expires_at: e.target.value })
                }
              />
              <p className="mt-1 text-[10px] text-zinc-600">Leave empty for no expiry</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-[#6B93B8]">{message}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
