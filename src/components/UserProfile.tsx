"use client";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { supabaseBrowser } from "@/lib/supabase";

export default function UserProfile() {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [gtid, setGtid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) {
      setPhone(user.user_metadata?.phone || "");
      setGtid(user.user_metadata?.gtid || "");
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({
        data: {
          phone: phone || null,
          gtid: gtid || null,
        }
      });

      if (error) throw error;
      setMessage("Profile updated successfully!");
    } catch (error: unknown) {
      setMessage("Error: " + (error instanceof Error ? error.message : 'An error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={user.email || ""}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
        />
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get SMS notifications when your laundry is done
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GTID
          </label>
          <input
            type="text"
            value={gtid}
            onChange={(e) => setGtid(e.target.value)}
            placeholder="Your Georgia Tech ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your Georgia Tech ID number for campus verification
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Updating..." : "Update Profile"}
        </button>

        {message && (
          <div className={`text-sm ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
