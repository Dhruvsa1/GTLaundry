"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import LocationRequestForm from "@/components/LocationRequestForm";

export default function RequestLocationPage() {
  return (
    <ProtectedRoute>
      <div className="py-6">
        <LocationRequestForm />
      </div>
    </ProtectedRoute>
  );
}
