import { ClientResults } from "@/components/admin/ClientResults";
import { getAdminClients, getClientFormChecks, getClientWorkoutLogs } from "@/lib/data";

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; week?: string; day?: string }>;
}) {
  const params = await searchParams;
  const clients = await getAdminClients();
  const selectedClientId =
    params.client && clients.some((c) => c.id === params.client)
      ? params.client
      : "";
  const week = Math.min(4, Math.max(1, parseInt(params.week ?? "1", 10) || 1));
  const day = Math.min(7, Math.max(1, parseInt(params.day ?? "1", 10) || 1));
  const logs = selectedClientId
    ? await getClientWorkoutLogs(selectedClientId, week, day)
    : [];
  const formChecks = selectedClientId
    ? await getClientFormChecks(selectedClientId, week, day)
    : [];
  return (
    <ClientResults
      clients={clients}
      selectedClientId={selectedClientId}
      week={week}
      day={day}
      logs={logs}
      formChecks={formChecks}
    />
  );
}
