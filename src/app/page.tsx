"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchLocations } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["locations"], queryFn: fetchLocations });

  if (isLoading) return <div className="p-6">Loading locations…</div>;
  if (error) return <div className="p-6 text-red-600">Failed to load locations</div>;

  return (
    <main className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Laundry Locations</h1>
        {user && (
          <span className="text-sm text-gray-600">
            Welcome, {user.email}
          </span>
        )}
      </div>
      
      {!user && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <p className="text-blue-800">
            Sign in to get personalized notifications and track your laundry cycles.
          </p>
          <Link 
            href="/login" 
            className="inline-block mt-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      )}
      
      <ul className="space-y-2">
        {data?.map((loc) => (
          <li key={loc.id} className="border rounded p-4 hover:bg-gray-50">
            <Link href={`/machines/${loc.id}`} className="font-medium">{loc.name}</Link>
            <div className="text-sm text-gray-500">{loc.address}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
