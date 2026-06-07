"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function ProfileToast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-[120] flex justify-center px-4 lg:bottom-8">
      <div
        className={cn(
          "w-full max-w-md rounded-xl border border-[#6B93B8]/40 bg-[#0d1520]/95 px-4 py-3 text-center text-sm text-white shadow-xl backdrop-blur-md"
        )}
        role="status"
      >
        {message}
      </div>
    </div>
  );
}
