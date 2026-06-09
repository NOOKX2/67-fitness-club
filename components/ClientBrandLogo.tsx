import Image from "next/image";
import Link from "next/link";
import { BRAND_NAME, LOGO_FULL, LOGO_HORIZONTAL } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-8 sm:h-9",
  md: "h-10 sm:h-11 lg:h-12",
  lg: "h-11 sm:h-12 lg:h-16",
} as const;

const MARK_SIZE_CLASS = {
  sm: "text-xl sm:text-2xl",
  md: "text-2xl sm:text-3xl lg:text-4xl",
  lg: "text-3xl sm:text-4xl lg:text-5xl",
} as const;

export function ClientBrandLogo({
  className,
  compact = false,
  size = compact ? "sm" : "md",
  variant = "horizontal",
}: {
  className?: string;
  /** @deprecated use `size` instead */
  compact?: boolean;
  size?: keyof typeof SIZE_CLASS;
  variant?: "horizontal" | "full" | "mark";
}) {
  const resolvedSize = compact && size === "md" ? "sm" : size;

  return (
    <Link
      href="/workouts"
      prefetch={false}
      aria-label={`${BRAND_NAME} — go to workouts`}
      className={cn("flex shrink-0 items-center no-underline", className)}
    >
      {variant === "mark" ? (
        <span
          className={cn(
            "font-extrabold leading-none tracking-[-0.06em] text-white",
            MARK_SIZE_CLASS[resolvedSize]
          )}
        >
          21
        </span>
      ) : (
        <Image
          src={variant === "full" ? LOGO_FULL : LOGO_HORIZONTAL}
          alt={BRAND_NAME}
          width={variant === "full" ? 1024 : 402}
          height={variant === "full" ? 576 : 148}
          priority
          className={cn("h-auto w-auto object-contain", SIZE_CLASS[resolvedSize])}
        />
      )}
    </Link>
  );
}
