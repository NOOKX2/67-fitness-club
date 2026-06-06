import { WorkoutClient } from "@/components/WorkoutClient";
import { getWorkoutPageData } from "@/lib/data";
import { requireAppUser } from "@/lib/session";

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; day?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const week = Math.min(4, Math.max(1, parseInt(params.week ?? "1", 10) || 1));
  const day = Math.min(7, Math.max(1, parseInt(params.day ?? "1", 10) || 1));
  const { days, logs, cardioLog } = await getWorkoutPageData(user.id, user.email, week, day);
  return (
    <WorkoutClient
      key={`${week}-${day}`}
      userId={user.id}
      week={week}
      day={day}
      days={days}
      initialLogs={logs}
      initialCardioLog={cardioLog}
    />
  );
}
