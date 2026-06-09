import type { Locale } from "./types";
import { translations } from "./translations";

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const value =
    getNestedValue(translations[locale] as Record<string, unknown>, key) ??
    getNestedValue(translations.en as Record<string, unknown>, key) ??
    key;

  if (!vars) return value;
  return Object.entries(vars).reduce(
    (text, [name, val]) => text.replaceAll(`{${name}}`, String(val)),
    value
  );
}
