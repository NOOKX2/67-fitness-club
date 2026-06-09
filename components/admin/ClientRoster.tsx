"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AdminClient } from "@/lib/data";
import { CreateClientModal } from "./CreateClientModal";
import { EditClientModal } from "./EditClientModal";
import { TierBadge } from "./TierBadge";
import {
  accessStatusLabel,
  expiryCountdownLabel,
  formatDateOnly,
  formatJoinedDate,
  genderLabel,
} from "./admin-utils";

export function ClientRoster({ clients }: { clients: AdminClient[] }) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<AdminClient | null>(null);
  const [clientsState, setClientsState] = useState(clients);

  useEffect(() => {
    setClientsState(clients);
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clientsState;
    return clientsState.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [clientsState, search]);

  function handleClientUpdated(updated: AdminClient) {
    setClientsState((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  }

  function handleClientCreated(created: AdminClient) {
    setClientsState((prev) => [created, ...prev]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-white">
          Client Roster
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="h-10 gap-2 bg-[#6B93B8] text-white hover:bg-[#5a82a7]"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-4 w-4" />
            Create New Client
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-56 border border-zinc-700 bg-black pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-zinc-800">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-950 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Gender</th>
              <th className="px-5 py-3">Program</th>
              <th className="px-5 py-3">Tier Level</th>
              <th className="px-5 py-3">Access</th>
              <th className="px-5 py-3">Start</th>
              <th className="px-5 py-3">Expires</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((c) => {
              const status = accessStatusLabel(c);
              const countdown = expiryCountdownLabel(c);
              return (
                <tr key={c.id} className="hover:bg-zinc-900/50">
                  <td className="px-5 py-4 font-medium text-white">{c.name}</td>
                  <td className="px-5 py-4 text-zinc-400">{c.email}</td>
                  <td className="px-5 py-4 text-zinc-400">
                    {genderLabel(c.gender)}
                  </td>
                  <td className="px-5 py-4 text-zinc-500">
                    {c.assigned_meal_plan ? "Assigned" : "Not set"}
                  </td>
                  <td className="px-5 py-4">
                    <TierBadge tier={c.tier_level} />
                  </td>
                  <td className={`px-5 py-4 text-xs font-semibold uppercase ${status.className}`}>
                    {status.label}
                  </td>
                  <td className="px-5 py-4 text-zinc-500">
                    {formatDateOnly(c.access_starts_at)}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-zinc-500">{formatDateOnly(c.access_expires_at)}</p>
                    <p className={`mt-0.5 text-xs font-medium ${countdown.className}`}>
                      {countdown.text}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-zinc-500">
                    {formatJoinedDate(c.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setEditingClient(c)}
                      className="flex h-8 w-8 items-center justify-center border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-zinc-500">No clients found</p>
        )}
      </div>

      {showModal && (
        <CreateClientModal
          onClose={() => setShowModal(false)}
          onCreated={handleClientCreated}
        />
      )}
      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={(updated) => {
            handleClientUpdated(updated);
            setEditingClient(null);
          }}
        />
      )}
    </div>
  );
}
