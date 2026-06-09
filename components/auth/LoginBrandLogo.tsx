import Image from "next/image";
import { BRAND_NAME, LOGO_FULL, LOGO_HORIZONTAL } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function LoginBrandLogo({ mobile = false }: { mobile?: boolean }) {
  if (mobile) {
    return (
      <Image
        src={LOGO_FULL}
        alt={BRAND_NAME}
        width={1024}
        height={576}
        priority
        className="h-14 w-auto object-contain"
      />
    );
  }

  return (
    <Image
      src={LOGO_HORIZONTAL}
      alt={BRAND_NAME}
      width={402}
      height={148}
      priority
      className={cn("h-12 w-auto object-contain sm:h-14")}
    />
  );
}
