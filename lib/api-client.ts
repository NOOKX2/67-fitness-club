export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data === "object" && data && "detail" in data
        ? String((data as { detail: string }).detail)
        : res.statusText;
    throw new Error(detail);
  }
  return data as T;
}

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  tier_level: string;
  created_at?: string;
  access_expires_at?: string | null;
  profile_photo_url?: string | null;
};
