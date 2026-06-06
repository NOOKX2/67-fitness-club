"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Camera, Pencil, Trophy, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import {
  formatLiftAmount,
  liftInputPlaceholder,
} from "@/lib/lift-utils";
import type { LiftRecord } from "@/lib/data";

const LIFT_EXERCISES = [
  "Chest Press",
  "Squat",
  "Hip Thrusts",
  "Long Run",
] as const;

function formatLiftDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatExpirationDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function recordFor(records: LiftRecord[], exercise: string) {
  return records.find((r) => r.exercise_name === exercise);
}

function liftStatusLabel(status?: string) {
  if (status === "Verified") return "Verified";
  if (status === "Rejected") return "Rejected";
  if (status === "Pending") return "Pending review";
  return null;
}

function LiftVerifiedCelebration({
  exercise,
  weight,
  verifiedDate,
  onClose,
}: {
  exercise: string;
  weight: number;
  verifiedDate: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-x-0 top-20 z-[100] flex justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#a3e635]/40 bg-zinc-950 px-5 py-5 text-center shadow-[0_0_40px_rgba(163,230,53,0.2)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#a3e635] bg-[#a3e635]/15">
          <Trophy className="h-7 w-7 text-[#a3e635]" />
        </div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">
          Coach Verified
        </p>
        <p className="mt-2 text-lg font-bold uppercase text-white">{exercise}</p>
        <p className="mt-1 text-3xl font-black tabular-nums text-[#a3e635]">
          {formatLiftAmount(exercise, weight)}
        </p>
        {verifiedDate && (
          <p className="mt-2 text-xs text-zinc-400">Verified {verifiedDate}</p>
        )}
        <p className="mt-3 text-sm text-zinc-300">Your PR is now official on your profile</p>
      </div>
    </div>
  );
}

export function ProfileClient({
  user,
  initialRecords,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    tier_level: string;
    created_at?: string;
    access_expires_at?: string | null;
    profile_photo_url?: string | null;
  };
  initialRecords: LiftRecord[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user.name);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user.profile_photo_url ?? "");
  const [photoPreview, setPhotoPreview] = useState("");
  const [lifts, setLifts] = useState<Record<string, string>>({});
  const [records, setRecords] = useState(initialRecords);
  const [message, setMessage] = useState("");
  const [verifiedCelebration, setVerifiedCelebration] = useState<{
    exercise: string;
    weight: number;
    verifiedDate: string | null;
  } | null>(null);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    for (const record of records) {
      if (record.verification_status !== "Verified") continue;
      const notifyKey = `lift-verified-${record.id}-${record.verified_at ?? record.submitted_at ?? "legacy"}`;
      if (typeof window === "undefined" || localStorage.getItem(notifyKey)) continue;
      localStorage.setItem(notifyKey, "1");
      setVerifiedCelebration({
        exercise: record.exercise_name,
        weight: record.weight_lifted,
        verifiedDate: formatLiftDate(record.verified_at ?? record.submitted_at),
      });
      break;
    }
  }, [records]);

  useEffect(() => {
    setProfilePhotoUrl(user.profile_photo_url ?? "");
  }, [user.profile_photo_url]);

  useEffect(() => {
    if (!editing) setName(user.name);
  }, [user.name, editing]);

  const avatarSrc = photoPreview || profilePhotoUrl;

  const memberSince =
    user.created_at?.slice(0, 4) ?? new Date().getFullYear().toString();
  const expirationDate = formatExpirationDate(user.access_expires_at);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    try {
      const res = await api<{
        message: string;
        name?: string;
        profile_photo_url?: string | null;
      }>("update-profile", {
        method: "POST",
        body: JSON.stringify({
          name,
          ...(photoPreview ? { profile_photo_base64: photoPreview } : {}),
        }),
      });
      if (res.profile_photo_url) setProfilePhotoUrl(res.profile_photo_url);
      setPhotoPreview("");
      setMessage("Profile saved");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setEditing(true);
    setMessage("");
  }

  function cancelEditing() {
    setEditing(false);
    setName(user.name);
    setPhotoPreview("");
    setMessage("");
  }

  async function onPhotoSelect(file: File | null) {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPhotoPreview(dataUrl);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not read photo");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submitLift(exerciseName: string) {
    const w = lifts[exerciseName];
    if (!w) return;
    try {
      const saved = await api<LiftRecord>("lift-progress", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          exercise_name: exerciseName,
          weight_lifted: Number(w),
        }),
      });
      setRecords((prev) => {
        const rest = prev.filter((r) => r.exercise_name !== exerciseName);
        return [...rest, saved];
      });
      setMessage(`Submitted ${exerciseName} for coach review`);
      setLifts((prev) => ({ ...prev, [exerciseName]: "" }));
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Submit failed");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {verifiedCelebration && (
        <LiftVerifiedCelebration
          exercise={verifiedCelebration.exercise}
          weight={verifiedCelebration.weight}
          verifiedDate={verifiedCelebration.verifiedDate}
          onClose={() => setVerifiedCelebration(null)}
        />
      )}
      <section className="rounded-2xl border border-zinc-800 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-white">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Manage your account details
            </p>
          </div>
          <div className="flex items-center gap-2">
            {editing && (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400 hover:border-zinc-500 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => (editing ? saveProfile() : startEditing())}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl border border-zinc-600 px-3 py-2 text-xs font-medium uppercase tracking-wide text-white hover:border-zinc-400 disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              {saving ? "Saving…" : editing ? "Save Profile" : "Edit Profile"}
            </button>
          </div>
        </div>

        <div className="mt-8 flex gap-6">
          <div className="shrink-0">
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-zinc-600" />
              )}
            </div>
            {editing && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPhotoSelect(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 flex w-24 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Upload
                </button>
              </>
            )}
          </div>
          <div className="flex-1 space-y-5">
            <div>
              <FieldLabel>Full Name</FieldLabel>
              {editing ? (
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              ) : (
                <p className="text-lg font-bold uppercase text-white">{name}</p>
              )}
            </div>
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <p className="text-lg text-white">{user.email}</p>
            </div>
          </div>
        </div>
        {message && (
          <p
            className={`mt-4 text-sm ${
              message === "Profile saved" ? "text-[#a3e635]" : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold uppercase text-white">
          <Award className="h-5 w-5 text-[#a3e635]" />
          My Top Lifts
        </h2>
        <div className="mt-6 space-y-6">
          {LIFT_EXERCISES.map((exercise) => {
            const record = recordFor(records, exercise);
            const status = record?.verification_status;
            const pending = status === "Pending";
            const verified = status === "Verified";
            const rejected = status === "Rejected";
            const submittedDate = formatLiftDate(record?.submitted_at);
            const verifiedDate = formatLiftDate(record?.verified_at ?? record?.submitted_at);
            const statusLabel = liftStatusLabel(status);
            return (
              <div key={exercise}>
                <p className="mb-2 text-sm font-bold uppercase text-white">
                  {exercise}
                </p>

                {verified && record && (
                  <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#a3e635]/40 bg-[#a3e635]/10 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#a3e635] text-black">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase text-[#a3e635]">
                        Coach Verified PR
                      </p>
                      <p className="text-lg font-black tabular-nums text-white">
                        {formatLiftAmount(exercise, record.weight_lifted)}
                      </p>
                      {verifiedDate && (
                        <p className="text-xs text-zinc-400">Verified {verifiedDate}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={liftInputPlaceholder(exercise, verified)}
                    value={lifts[exercise] ?? ""}
                    onChange={(e) =>
                      setLifts((prev) => ({
                        ...prev,
                        [exercise]: e.target.value,
                      }))
                    }
                    disabled={pending}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="dark"
                    className="h-[46px] shrink-0 px-6 text-xs"
                    onClick={() => submitLift(exercise)}
                    disabled={pending || !lifts[exercise]}
                  >
                    Submit
                  </Button>
                </div>

                {record && (
                  <p className="mt-2 text-xs text-zinc-400">
                    {submittedDate ? (
                      <>
                        Last submitted {submittedDate} ·{" "}
                        {formatLiftAmount(exercise, record.weight_lifted)}
                      </>
                    ) : (
                      <>Submitted · {formatLiftAmount(exercise, record.weight_lifted)}</>
                    )}
                    {statusLabel && (
                      <span
                        className={
                          verified
                            ? "text-[#a3e635]"
                            : rejected
                              ? "text-red-400"
                              : "text-zinc-500"
                        }
                      >
                        {" "}
                        · {statusLabel}
                      </span>
                    )}
                  </p>
                )}

                {pending && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Waiting for coach approval on Weight Verification
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex overflow-hidden rounded-2xl border border-zinc-800">
        <div className="flex-1 border-r border-zinc-800 p-6">
          <FieldLabel>Current Tier</FieldLabel>
          <p className="mt-2 text-3xl font-bold text-white">{user.tier_level}</p>
        </div>
        <div className="flex-1 border-r border-zinc-800 p-6">
          <FieldLabel>Member Since</FieldLabel>
          <p className="mt-2 text-3xl font-bold text-white">{memberSince}</p>
        </div>
        <div className="flex-1 p-6">
          <FieldLabel>Expiration Date</FieldLabel>
          <p className="mt-2 text-3xl font-bold text-white">{expirationDate}</p>
        </div>
      </section>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}
