"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const options: { code: Locale; flag: string; label: string }[] = [
  { code: "th", flag: "🇹🇭", label: "Thai" },
  { code: "en", flag: "🇬🇧", label: "English" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className={cn("flex items-center gap-3", className)}
      role="group"
      aria-label={t("language.label")}
    >
      {options.map(({ code, flag, label }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-base leading-none transition-all",
              active
                ? "border-[#6B93B8] bg-[#6B93B8]/20 ring-2 ring-[#6B93B8]/60"
                : "border-white/10 bg-black/50 opacity-55 hover:opacity-100"
            )}
          >
            <span aria-hidden className="text-[15px]">
              {flag}
            </span>
          </button>
        );
      })}
    </div>
  );
}
