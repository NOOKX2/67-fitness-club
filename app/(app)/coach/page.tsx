import { CoachClient } from "@/components/CoachClient";
import { getCoaches, getMessages, getWeeklyReports } from "@/lib/data";
import { requireAppUser } from "@/lib/session";

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ coach?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const coaches = await getCoaches();
  const coachId =
    params.coach && coaches.some((c) => c.id === params.coach)
      ? params.coach
      : (coaches[0]?.id ?? "");
  const messages = coachId ? await getMessages(user.id, coachId) : [];
  const weeklyReports = await getWeeklyReports(user.id);
  return (
    <CoachClient
      userId={user.id}
      coaches={coaches}
      coachId={coachId}
      initialMessages={messages}
      initialReports={weeklyReports}
    />
  );
}
