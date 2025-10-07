"use client";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

async function fetchLocationRequests() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('location_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Add placeholder user data since we can't access auth.users directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data?.map((request: any) => ({
    ...request,
    users: {
      email: `User ${request.user_id.slice(0, 8)}...`
    }
  })) || [];
}

export default function AdminRequestsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<{id: string; name: string; description?: string; estimated_machines?: Array<{type: string; count: number}>; created_at: string; address?: string; contact_email?: string; contact_phone?: string; users?: {email: string}} | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['location-requests'],
    queryFn: fetchLocationRequests
  });

  // Filter and sort logic
  const filteredRequests = useMemo(() => {
    if (!requests) return [];

    let filtered = requests;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [requests, searchTerm, statusFilter, sortBy]);

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const processedRequests = filteredRequests.filter(r => r.status !== 'pending');

  const handleApprove = async (requestId: string) => {
    if (!user) return;

    try {
      const supabase = supabaseBrowser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('location_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['location-requests'] });
      setSelectedRequest(null);
      setReviewNotes("");
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;

    try {
      const supabase = supabaseBrowser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('location_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['location-requests'] });
      setSelectedRequest(null);
      setReviewNotes("");
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">Error loading requests</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Location Requests</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review and manage location requests from users.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredRequests.length} total requests
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search requests..."
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          {/* Quick Stats */}
          <div className="flex space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {processedRequests.filter(r => r.status === 'approved').length}
              </div>
              <div className="text-xs text-gray-500">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {processedRequests.filter(r => r.status === 'rejected').length}
              </div>
              <div className="text-xs text-gray-500">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Pending Requests ({pendingRequests.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{request.name}</h4>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        PENDING
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{request.address}</p>
                    {request.description && (
                      <p className="text-sm text-gray-500 mb-3">{request.description}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                      <div>
                        <p><span className="font-medium">Requested by:</span> {request.users?.email}</p>
                        <p><span className="font-medium">Contact:</span> {request.contact_email}</p>
                        {request.contact_phone && <p><span className="font-medium">Phone:</span> {request.contact_phone}</p>}
                      </div>
                      <div>
                        <p><span className="font-medium">Estimated machines:</span></p>
                        <p>{request.estimated_machines?.map((m: {type: string; count: number}) => `${m.count} ${m.type}s`).join(', ')}</p>
                        <p><span className="font-medium">Submitted:</span> {new Date(request.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Processed Requests ({processedRequests.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {processedRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{request.name}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        request.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{request.address}</p>
                    {request.review_notes && (
                      <p className="text-sm text-gray-500 mb-3">
                        <span className="font-medium">Review Notes:</span> {request.review_notes}
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                      <div>
                        <p><span className="font-medium">Requested by:</span> {request.users?.email}</p>
                        <p><span className="font-medium">Contact:</span> {request.contact_email}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Reviewed:</span> {new Date(request.reviewed_at).toLocaleDateString()}</p>
                        <p><span className="font-medium">Submitted:</span> {new Date(request.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No requests found</p>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Review Request: {selectedRequest.name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewNotes("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p><span className="font-medium">Address:</span> {selectedRequest.address}</p>
                    <p><span className="font-medium">Contact:</span> {selectedRequest.contact_email}</p>
                    {selectedRequest.contact_phone && (
                      <p><span className="font-medium">Phone:</span> {selectedRequest.contact_phone}</p>
                    )}
                  </div>
                  <div>
                    <p><span className="font-medium">Requested by:</span> {selectedRequest.users?.email}</p>
                    <p><span className="font-medium">Submitted:</span> {new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {selectedRequest.description && (
                  <div className="mt-3">
                    <p><span className="font-medium">Description:</span></p>
                    <p className="text-gray-600">{selectedRequest.description}</p>
                  </div>
                )}
                <div className="mt-3">
                  <p><span className="font-medium">Estimated Machines:</span></p>
                  <p className="text-gray-600">{selectedRequest.estimated_machines?.map((m: {type: string; count: number}) => `${m.count} ${m.type}s`).join(', ')}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add notes about your decision..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewNotes("");
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
