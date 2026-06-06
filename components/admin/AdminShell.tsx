"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Apple,
  CheckCircle,
  LayoutGrid,
  LogOut,
  MessageCircle,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Video,
  Wand2,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard Overview", icon: LayoutGrid, exact: true },
  { href: "/admin/clients", label: "Client Roster", icon: Users },
  { href: "/admin/chat", label: "Chat with Clients", icon: MessageCircle },
  { href: "/admin/programs", label: "Program Builder", icon: Wand2 },
  { href: "/admin/custom-programs", label: "Custom Programs", icon: UserPlus },
  { href: "/admin/results", label: "Client Results", icon: TrendingUp },
  { href: "/admin/weight-verification", label: "Weight Verification", icon: Trophy },
  { href: "/admin/videos", label: "Exercise Video Library", icon: Video },
  { href: "/admin/nutrition", label: "Nutrition Review", icon: Apple },
  { href: "/admin/form-checks", label: "Video Form-Check Queue", icon: CheckCircle },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[#0a0e14] text-white">
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-[#0a0e14]">
        <div className="border-b border-zinc-800 px-5 py-6">
          <p className="text-sm font-bold uppercase tracking-widest text-[#a3e635]">
            Admin Portal
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Admin</p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-[#a3e635] text-black"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-end border-b border-zinc-800 bg-[#0a0e14] px-8 py-4">
          <NotificationBell isAdmin />
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
