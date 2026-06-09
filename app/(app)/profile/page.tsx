import { ProfileClient } from "@/components/ProfileClient";
import { getLiftRecords, getUserProfilePhotoUrl, getUserTdee } from "@/lib/data";
import { requireAppUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireAppUser();
  const [records, profilePhotoUrl, tdee] = await Promise.all([
    getLiftRecords(user.id),
    getUserProfilePhotoUrl(user.id),
    getUserTdee(user.id),
  ]);
  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        tier_level: user.tier_level,
        created_at: user.created_at,
        access_expires_at: user.access_expires_at,
        profile_photo_url: profilePhotoUrl ?? user.profile_photo_url ?? null,
        tdee,
      }}
      initialRecords={records}
    />
  );
}
