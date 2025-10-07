"use client";
import { subscribeWebPush } from "@/lib/push";
import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import UserProfile from "@/components/UserProfile";

export default function SettingsPage() {
  const [msg, setMsg] = useState<string>("");

  const onSub = async () => {
    try {
      await subscribeWebPush();
      setMsg("Subscribed to web push!");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setMsg("Failed: " + errorMessage);
    }
  };

  const onTest = async () => {
    const r = await fetch("/api/push/send-test", { method: "POST" });
    let j: {ok?: boolean; error?: string} | null = null;
    try {
      j = await r.json();
    } catch {
      // ensure we handle non-JSON responses gracefully
      setMsg("Error: Failed to parse server response");
      return;
    }
    setMsg(j?.ok ? "Sent test push!" : "Error: " + (j?.error ?? "Unknown error"));
  };

  return (
    <ProtectedRoute>
      <main className="p-6 space-y-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        
        {/* User Profile Section */}
        <div className="bg-white border rounded-lg p-6">
          <UserProfile />
        </div>

        {/* Notification Settings Section */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          <div className="space-y-4">
            <button onClick={onSub} className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800">
              Enable Web Push
            </button>
            <button onClick={onTest} className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 ml-2">
              Send Test Push
            </button>
            <div className="text-sm text-gray-700">{msg}</div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
