import { CustomPrograms } from "@/components/admin/CustomPrograms";
import {
  getAdminClients,
  getCustomProgram,
  getExerciseVideos,
  getNutritionLimits,
} from "@/lib/data";

export default async function AdminCustomProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; week?: string; day?: string }>;
}) {
  const params = await searchParams;
  const clients = await getAdminClients();
  const selectedEmail =
    params.client && clients.some((c) => c.email === params.client)
      ? params.client
      : "";
  const week = Math.min(4, Math.max(1, parseInt(params.week ?? "1", 10) || 1));
  const day = Math.min(7, Math.max(1, parseInt(params.day ?? "1", 10) || 1));
  const [{ exercises, cardio }, videos, initialLimits] = await Promise.all([
    selectedEmail ? getCustomProgram(selectedEmail, week, day) : { exercises: [], cardio: null },
    getExerciseVideos(),
    selectedEmail ? getNutritionLimits(selectedEmail) : Promise.resolve({}),
  ]);
  return (
    <CustomPrograms
      key={`${selectedEmail}-${week}-${day}`}
      clients={clients}
      selectedEmail={selectedEmail}
      week={week}
      day={day}
      initialExercises={exercises}
      initialCardio={cardio}
      initialLimits={initialLimits}
      videos={videos}
    />
  );
}
