"use client";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabaseBrowser } from "@/lib/supabase";

export default function LocationRequestForm() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    building: "",
    floor: "",
    contact_email: user?.email || "",
    contact_phone: "",
    estimated_washers: 2,
    estimated_dryers: 2
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const supabase = supabaseBrowser();
      
      const estimated_machines = [
        { type: "washer", count: formData.estimated_washers },
        { type: "dryer", count: formData.estimated_dryers }
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('location_requests')
        .insert({
          user_id: user.id,
          name: formData.name,
          address: formData.address,
          description: formData.description,
          building: formData.building,
          floor: formData.floor,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          estimated_machines
        });

      if (error) throw error;

      setMessage("Request submitted successfully! We'll review it and get back to you.");
      setFormData({
        name: "",
        address: "",
        description: "",
        building: "",
        floor: "",
        contact_email: user.email || "",
        contact_phone: "",
        estimated_washers: 2,
        estimated_dryers: 2
      });
    } catch (error: unknown) {
      setMessage("Error submitting request: " + (error instanceof Error ? error.message : 'An error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value) || 0
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Request New Location</h2>
        <p className="text-gray-600 mb-6">
          Know of a laundry area that should be tracked? Submit a request and we&apos;ll review it!
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Location Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Main Hall Basement"
              />
            </div>

            <div>
              <label htmlFor="building" className="block text-sm font-medium text-gray-700">
                Building
              </label>
              <input
                type="text"
                id="building"
                name="building"
                value={formData.building}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Main Hall"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address *
            </label>
            <input
              type="text"
              id="address"
              name="address"
              required
              value={formData.address}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 123 Campus Way, Atlanta, GA"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="floor" className="block text-sm font-medium text-gray-700">
                Floor/Level
              </label>
              <input
                type="text"
                id="floor"
                name="floor"
                value={formData.floor}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Basement, 1st Floor"
              />
            </div>

            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                Contact Phone
              </label>
              <input
                type="tel"
                id="contact_phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
              Contact Email
            </label>
            <input
              type="email"
              id="contact_email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional details about this location..."
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="estimated_washers" className="block text-sm font-medium text-gray-700">
                Estimated Washers
              </label>
              <input
                type="number"
                id="estimated_washers"
                name="estimated_washers"
                min="0"
                max="20"
                value={formData.estimated_washers}
                onChange={handleNumberChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="estimated_dryers" className="block text-sm font-medium text-gray-700">
                Estimated Dryers
              </label>
              <input
                type="number"
                id="estimated_dryers"
                name="estimated_dryers"
                min="0"
                max="20"
                value={formData.estimated_dryers}
                onChange={handleNumberChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>

          {message && (
            <div className={`text-sm ${
              message.includes("Error") ? "text-red-600" : "text-green-600"
            }`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
