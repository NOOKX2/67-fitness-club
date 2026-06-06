"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Apple,
  Bell,
  Calendar,
  Crown,
  LineChart,
  LogOut,
  MessageCircle,
  Pencil,
  User as UserIcon,
} from "lucide-react";
import { ClientAppBackground } from "@/components/ClientAppBackground";
import { MuscleStreakBadges } from "@/components/MuscleStreakBadges";
import { PromoMarquee } from "@/components/PromoMarquee";
import {
  MuscleStreakProvider,
  useMuscleStreakStatus,
} from "@/components/MuscleStreakContext";
import { api, type User } from "@/lib/api-client";
import type { DailyMuscleStatus } from "@/lib/muscle-streak-types";
import { isAdminRole } from "@/lib/routes";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/workouts", label: "WORKOUTS", icon: Calendar },
  { href: "/nutrition", label: "NUTRITION", icon: Apple },
  { href: "/progress", label: "PROGRESS", icon: LineChart },
  { href: "/coach", label: "COACH", icon: MessageCircle },
  { href: "/profile", label: "PROFILE", icon: UserIcon },
];

function tierBadgeLabel(tier: string) {
  if (tier === "Tier 3") return "TIER 3: VIP";
  if (tier === "Admin") return "ADMIN";
  return tier.toUpperCase();
}

function AppShellHeader({
  user,
}: {
  user: User;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const streakStatus = useMuscleStreakStatus();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await api("auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isVip = user.tier_level === "Tier 3" || user.tier_level === "Admin";

  if (!streakStatus) return null;

  return (
    <div className="mx-auto flex max-w-5xl items-end justify-between gap-4 px-6 pt-4">
          <div className="shrink-0 pb-2">
            <MuscleStreakBadges status={streakStatus} compact />
          </div>
          <nav className="flex items-end justify-center gap-10 sm:gap-14">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 pb-3 transition-colors",
                    active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px] font-semibold tracking-widest">
                    {label}
                  </span>
                  {active && (
                    <span className="absolute -bottom-px left-1/2 h-0.5 w-10 -translate-x-1/2 bg-white" />
                  )}
                </Link>
              );
            })}
            {isAdminRole(user.role) && (
              <Link
                href="/admin"
                className={cn(
                  "flex flex-col items-center gap-1.5 pb-3 text-[10px] font-semibold tracking-widest",
                  pathname === "/admin" ? "text-white" : "text-zinc-500"
                )}
              >
                <span className="text-xs">ADMIN</span>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4 pb-2">
            <button
              type="button"
              className="text-white"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
            </button>
            {isVip ? (
              <span className="flex items-center gap-1.5 rounded-md bg-[#a3e635] px-3 py-1.5 text-[10px] font-bold tracking-wide text-black">
                <Crown className="h-3.5 w-3.5" />
                {tierBadgeLabel(user.tier_level)}
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                {user.tier_level}
              </span>
            )}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-600 bg-zinc-900"
                aria-label="Account menu"
              >
                {user.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profile_photo_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-4 w-4 text-zinc-400" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 py-2 shadow-xl">
                  <div className="border-b border-zinc-800 px-4 pb-3">
                    <p className="font-bold uppercase text-white">{user.name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                    {isVip && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#a3e635] px-2 py-0.5 text-[9px] font-bold text-black">
                        <Crown className="h-3 w-3" />
                        {tierBadgeLabel(user.tier_level)}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-zinc-900"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-zinc-900"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
    </div>
  );
}

export function AppShell({
  user,
  muscleStatus,
  children,
}: {
  user: User;
  muscleStatus: DailyMuscleStatus;
  children: React.ReactNode;
}) {
  return (
    <MuscleStreakProvider initialStatus={muscleStatus}>
      <div className="relative min-h-screen bg-zinc-950 text-white">
        <ClientAppBackground />

        <div className="relative z-10">
          <header className="border-b border-zinc-800/80 bg-black/55 backdrop-blur-md">
            <AppShellHeader user={user} />
            <PromoMarquee />
          </header>

          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </div>
      </div>
    </MuscleStreakProvider>
  );
}
