"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchMachines } from "@/lib/api";
import { useParams } from "next/navigation";
import dayjs from "dayjs";

export default function MachinesList() {
  const params = useParams<{ locationId: string }>();
  const locationId = params.locationId;
  const { data, isLoading, error } = useQuery({
    queryKey: ["machines", locationId],
    queryFn: () => fetchMachines(locationId),
    enabled: !!locationId
  });

  if (isLoading) return <div className="p-6">Loading machines…</div>;
  if (error) return <div className="p-6 text-red-600">Failed to load machines</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {data?.map(m => (
        <div key={m.id} className="border rounded p-4">
          <div className="font-medium">{m.label} · {m.type}</div>
          <div className="text-sm mt-1">
            Status: <span className="font-semibold">{m.status}</span>
          </div>
          {m.cycle_ends_at && (
            <div className="text-sm text-gray-600">
              ETA: {dayjs(m.cycle_ends_at).format("h:mm A")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
