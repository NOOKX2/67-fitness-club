"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { clientField } from "@/lib/client-ui";
import { localDateKey } from "@/lib/date-utils";

function formatDisplayDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function shiftDateKey(dateKey: string, delta: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(y, m - 1, d + delta);
  return localDateKey(next);
}

export function NutritionHeader({
  selectedDate = localDateKey(new Date()),
  isToday = selectedDate === localDateKey(new Date()),
  showAddButton = true,
}: {
  selectedDate?: string;
  isToday?: boolean;
  showAddButton?: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const today = localDateKey(new Date());
  const canGoForward = selectedDate < today;

  function navigate(date: string) {
    const params = new URLSearchParams();
    if (date !== today) params.set("date", date);
    const query = params.toString();
    router.push(query ? `/nutrition?${query}` : "/nutrition");
  }

  return (
    <ClientPageHeader
      eyebrow={t("nutrition.eyebrow")}
      title={t("nutrition.title")}
      actions={
        <>
          <div className={`flex items-stretch overflow-hidden ${clientField}`}>
            <button
              type="button"
              onClick={() => navigate(shiftDateKey(selectedDate, -1))}
              className="flex w-10 items-center justify-center text-white/45 transition-colors hover:bg-white/5 hover:text-white"
              aria-label={t("common.previousDay")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="relative flex cursor-pointer items-center gap-2 border-x border-white/10 px-4 py-2.5">
              <Calendar className="h-4 w-4 shrink-0 text-[#a8c5dc]" />
              <span className="text-sm text-white">{formatDisplayDate(selectedDate)}</span>
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => {
                  if (e.target.value) navigate(e.target.value);
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={t("common.pickDate")}
              />
            </label>
            <button
              type="button"
              onClick={() => navigate(shiftDateKey(selectedDate, 1))}
              disabled={!canGoForward}
              className="flex w-10 items-center justify-center text-white/45 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={t("common.nextDay")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {!isToday && (
            <button
              type="button"
              onClick={() => navigate(today)}
              className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-white/45 transition-colors hover:border-white/25 hover:text-white"
            >
              {t("common.today")}
            </button>
          )}
          {showAddButton && isToday && (
            <Link href="/nutrition/add" className="w-full sm:w-auto">
              <Button type="button" className="h-11 w-full gap-2 px-4 text-xs sm:w-auto sm:px-5">
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">{t("common.add")}</span>
                <span className="hidden sm:inline">{t("nutrition.addMeal")}</span>
              </Button>
            </Link>
          )}
        </>
      }
    />
  );
}
