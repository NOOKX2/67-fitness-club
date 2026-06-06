import Link from "next/link";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NutritionHeader({
  showAddButton = true,
}: {
  showAddButton?: boolean;
}) {
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  return (
    <>
      <div className="border-b border-zinc-800 bg-zinc-950 py-4">
        <p className="text-sm font-bold uppercase tracking-widest text-white">
          Nutrition Trends
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold uppercase tracking-tight text-white">
          Nutrition Tracker
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-black px-4 py-2.5">
            <Calendar className="h-4 w-4 text-[#a3e635]" />
            <span className="text-sm text-white">{dateStr}</span>
          </div>
          {showAddButton && (
            <Link href="/nutrition/add">
              <Button type="button" className="h-11 gap-2 px-5 text-xs">
                <Plus className="h-4 w-4" />
                Add Meal
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
