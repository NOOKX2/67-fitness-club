"use client";

import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { MOBILE_FILE_INPUT_CLASS } from "@/lib/file-upload";

type FilePickerProps = {
  accept: string;
  onFile: (file: File) => void;
  children: ReactNode;
  disabled?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick">;

export function FilePicker({
  accept,
  onFile,
  children,
  disabled,
  className,
  ...buttonProps
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className={MOBILE_FILE_INPUT_CLASS}
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        className={className}
        onClick={() => inputRef.current?.click()}
        {...buttonProps}
      >
        {children}
      </button>
    </>
  );
}
