"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Apple,
  CheckCircle,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Video,
  Wand2,
  X,
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

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentPageLabel(pathname: string) {
  const match = navItems.find(({ href, exact }) => isNavActive(pathname, href, exact));
  return match?.label ?? "Admin Portal";
}

function AdminSidebarNav({
  pathname,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isNavActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors",
                active
                  ? "bg-[#6B93B8] text-white"
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
          onClick={onLogout}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const pageTitle = currentPageLabel(pathname);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen]);

  async function logout() {
    await api("auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function closeNav() {
    setNavOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-[#0a0e14] text-white">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-[#0a0e14] lg:flex">
        <div className="border-b border-zinc-800 px-5 py-6">
          <p className="text-sm font-bold uppercase tracking-widest text-[#6B93B8]">
            Admin Portal
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Admin</p>
        </div>
        <AdminSidebarNav pathname={pathname} onLogout={logout} />
      </aside>

      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={closeNav}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-3rem))] flex-col border-r border-zinc-800 bg-[#0a0e14] shadow-2xl transition-transform duration-200 lg:hidden",
          navOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!navOpen}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#6B93B8]">
              Admin Portal
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">Admin</p>
          </div>
          <button
            type="button"
            onClick={closeNav}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <AdminSidebarNav pathname={pathname} onNavigate={closeNav} onLogout={logout} />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-[#0a0e14] px-4 py-3 lg:justify-end lg:px-8 lg:py-4">
          <div className="flex min-w-0 items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900"
              aria-label="Open navigation menu"
              aria-expanded={navOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase tracking-wide text-white">
                {pageTitle}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Admin</p>
            </div>
          </div>
          <NotificationBell isAdmin />
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
