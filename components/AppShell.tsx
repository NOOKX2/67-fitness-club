"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Crown,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Timer,
  User as UserIcon,
} from "lucide-react";
import { ClientAppBackground } from "@/components/ClientAppBackground";
import { ClientBrandLogo } from "@/components/ClientBrandLogo";
import { LanguageProvider, useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MuscleStreakBadges } from "@/components/MuscleStreakBadges";
import { NotificationBell } from "@/components/NotificationBell";
import {
  MuscleStreakProvider,
  useMuscleStreakStatus,
} from "@/components/MuscleStreakContext";
import { api, type User } from "@/lib/api-client";
import { clientGlassNav } from "@/lib/client-ui";
import type { DailyMuscleStatus } from "@/lib/muscle-streak-types";
import { isAdminRole } from "@/lib/routes";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/workouts", labelKey: "nav.workouts", icon: LayoutGrid },
  { href: "/nutrition", labelKey: "nav.nutrition", icon: Timer },
  { href: "/progress", labelKey: "nav.progress", icon: Activity },
  { href: "/coach", labelKey: "nav.coach", icon: MessageCircle },
  { href: "/profile", labelKey: "nav.profile", icon: UserIcon },
] as const;

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tierBadgeLabel(tier: string, t: (key: string) => string) {
  if (tier === "Tier 3") return t("common.tierVip");
  if (tier === "Admin") return "ADMIN";
  return tier.toUpperCase();
}

function AccountMenu({
  user,
  menuOpen,
  setMenuOpen,
  menuRef,
  onLogout,
}: {
  user: User;
  menuOpen: boolean;
  setMenuOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isVip = user.tier_level === "Tier 3" || user.tier_level === "Admin";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/50"
        aria-label={t("common.accountMenu")}
        aria-expanded={menuOpen}
      >
        {user.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.profile_photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserIcon className="h-4 w-4 text-white/45" />
        )}
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-black/90 py-2 shadow-xl backdrop-blur-md">
          <div className="border-b border-white/10 px-4 pb-3">
            <p className="font-bold text-white">{user.name}</p>
            <p className="text-xs text-white/45">{user.email}</p>
            {isVip ? (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#6B93B8] px-2 py-1 text-[9px] font-bold tracking-wide text-white lg:hidden">
                <Crown className="h-3.5 w-3.5" />
                {tierBadgeLabel(user.tier_level, t)}
              </span>
            ) : null}
          </div>
          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className={cn(
              "hidden w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-white/5 lg:flex",
              isNavActive(pathname, "/profile") ? "text-white" : "text-white/70"
            )}
          >
            <UserIcon className="h-4 w-4" />
            {t("nav.profile")}
          </Link>
          {isAdminRole(user.role) && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-white/5",
                pathname.startsWith("/admin") ? "text-white" : "text-white/70"
              )}
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            {t("common.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

function MobileBottomNav({ pathname }: { pathname: string }) {
  const { t } = useLanguage();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-xl lg:hidden"
      aria-label="Main navigation"
    >
      <div
        className="mx-auto flex max-w-lg items-stretch px-1"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2.5 transition-colors",
                active ? "text-white" : "text-white/40 active:text-white/70"
              )}
            >
              <Icon
                className={cn("h-5 w-5", active ? "stroke-white" : "stroke-current")}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className="max-w-full truncate text-[9px] font-semibold tracking-[0.06em] uppercase">
                {t(labelKey)}
              </span>
              {active ? (
                <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[#6B93B8]" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AppShellHeader({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
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
    <div className="flex w-full items-center gap-2 py-3 lg:grid lg:min-h-[76px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-x-6 lg:py-4">
      <div className="hidden min-w-0 items-center gap-2 justify-self-start lg:flex">
        <LanguageSwitcher />
        <MuscleStreakBadges status={streakStatus} compact />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
        <LanguageSwitcher className="shrink-0" />
        <MuscleStreakBadges status={streakStatus} compact />
      </div>

      <nav className="hidden items-center justify-center gap-2 justify-self-center lg:flex">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[10px] px-[18px] py-2 transition-colors",
                active
                  ? cn(clientGlassNav, "text-white")
                  : "text-white/45 hover:bg-white/[0.07] hover:text-white"
              )}
            >
              <Icon
                className={cn("h-[18px] w-[18px]", active ? "stroke-white" : "stroke-current")}
                strokeWidth={2}
              />
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase">
                {t(labelKey)}
              </span>
            </Link>
          );
        })}
        {isAdminRole(user.role) && (
          <Link
            href="/admin"
            className={cn(
              "rounded-[10px] px-3 py-2 text-[10px] font-semibold tracking-widest uppercase",
              pathname.startsWith("/admin")
                ? cn(clientGlassNav, "text-white")
                : "text-white/45 hover:bg-white/[0.07]"
            )}
          >
            {t("nav.admin")}
          </Link>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-2 lg:gap-3 lg:justify-self-end">
        <NotificationBell />
        {isVip ? (
          <span className="hidden items-center gap-1.5 rounded-md bg-[#6B93B8] px-2 py-1 text-[9px] font-bold tracking-wide text-white lg:flex">
            <Crown className="h-3.5 w-3.5" />
            {tierBadgeLabel(user.tier_level, t)}
          </span>
        ) : null}
        <AccountMenu
          user={user}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          menuRef={menuRef}
          onLogout={logout}
        />
        <ClientBrandLogo variant="full" size="lg" className="ml-0.5 sm:ml-1" />
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
  const pathname = usePathname();

  return (
    <LanguageProvider>
    <MuscleStreakProvider initialStatus={muscleStatus}>
      <div className="relative min-h-screen bg-[#0d0d0d] font-[family-name:var(--font-dm-sans)] text-[#F0F4F8]">
        <ClientAppBackground />

        <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-14 xl:px-16">
            <AppShellHeader user={user} />
          </div>
        </header>

        <main
          className="relative z-10 mx-auto w-full max-w-[900px] px-4 pt-[72px] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:px-6 lg:pt-[108px] lg:pb-16"
        >
          {children}
        </main>

        <MobileBottomNav pathname={pathname} />
      </div>
    </MuscleStreakProvider>
    </LanguageProvider>
  );
}
