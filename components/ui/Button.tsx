import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline" | "ghost" | "dark";
  }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50",
        variant === "primary" &&
          "bg-white text-black hover:bg-zinc-200",
        variant === "outline" &&
          "border border-zinc-600 bg-transparent text-white hover:border-zinc-400",
        variant === "ghost" && "text-zinc-400 hover:text-white",
        variant === "dark" &&
          "border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800",
        className
      )}
      {...props}
    />
  );
});
