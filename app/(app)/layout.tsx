import { AppShell } from "@/components/AppShell";
import { getDailyMuscleStatus } from "@/lib/muscle-streak";
import { requireAppUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAppUser();
  const muscleStatus = await getDailyMuscleStatus(user.id);
  return (
    <AppShell user={user} muscleStatus={muscleStatus}>
      {children}
    </AppShell>
  );
}
