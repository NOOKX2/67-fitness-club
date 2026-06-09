import { AlertCircle, DollarSign, TrendingUp } from "lucide-react";
import type { AdminActivity, AdminStats } from "@/lib/data";
import { formatJoinedDate } from "./admin-utils";

export function AdminDashboard({
  stats,
  activity,
}: {
  stats: AdminStats;
  activity: AdminActivity[];
}) {
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold uppercase tracking-wide text-white sm:text-2xl">
        Dashboard Overview
      </h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-zinc-800 bg-zinc-950/80 p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6B93B8]/20">
              <TrendingUp className="h-5 w-5 text-[#6B93B8]" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Active
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">{stats.total_clients}</p>
          <p className="mt-1 text-xs text-zinc-500">Total Active Clients</p>
        </div>

        <div className="border border-zinc-800 bg-zinc-950/80 p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/20">
              <DollarSign className="h-5 w-5 text-amber-400" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Revenue
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">
            ${stats.mrr.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Monthly Recurring Revenue</p>
        </div>

        <div className="border border-zinc-800 bg-zinc-950/80 p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Churn
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">{stats.churn_rate}%</p>
          <p className="mt-1 text-xs text-zinc-500">Churn Rate</p>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">
          Recent Client Activity
        </h2>
        <div className="divide-y divide-zinc-800 border border-zinc-800">
          {activity.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">No clients yet</p>
          ) : (
            activity.map((a) => (
              <div
                key={a.email}
                className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div>
                  <p className="font-semibold text-white">{a.name}</p>
                  <p className="text-sm text-zinc-500">{a.email}</p>
                </div>
                <p className="text-xs text-zinc-500">
                  Joined {formatJoinedDate(a.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
