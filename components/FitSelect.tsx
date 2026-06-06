import { cn } from "@/lib/utils";

export function FitSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: number | string;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-[140px] rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
