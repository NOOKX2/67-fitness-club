import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none",
          className
        )}
        {...props}
      />
    );
  }
);

export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
    {children}
  </span>
);
