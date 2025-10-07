import MachinesList from "@/components/MachinesList";
import ProtectedRoute from "@/components/ProtectedRoute";

// For static export, we need to generate static params
export async function generateStaticParams() {
  // This will be populated at build time
  return [];
}

export default function MachinesPage() {
  return (
    <ProtectedRoute>
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Machines</h1>
        <MachinesList />
      </main>
    </ProtectedRoute>
  );
}
