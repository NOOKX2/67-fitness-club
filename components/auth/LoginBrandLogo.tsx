import { cn } from "@/lib/utils";

export function LoginBrandLogo({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className="flex items-center gap-3.5">
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-[14px] shadow-[0_4px_20px_rgba(0,0,0,0.25)]",
          mobile ? "bg-[#6b93b8]" : "bg-white"
        )}
      >
        <span
          className={cn(
            "text-[22px] font-extrabold leading-none tracking-tight",
            mobile ? "text-white" : "text-[#6b93b8]"
          )}
        >
          21
        </span>
      </div>
      <div className={cn("leading-tight", mobile ? "text-[#1a2634]" : "text-white")}>
        <strong className="block text-[17px] font-bold tracking-wide">Training Club</strong>
        <small
          className={cn(
            "text-[11px] font-normal uppercase tracking-[0.25em]",
            mobile ? "text-[#7a95aa]" : "text-white/65"
          )}
        >
          Elite Performance
        </small>
      </div>
    </div>
  );
}
