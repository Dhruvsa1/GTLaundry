"use client";
import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

async function fetchAdminStats() {
  const supabase = supabaseBrowser();
  
  // Fetch various statistics
  const [
    { count: totalUsers },
    { count: totalLocations },
    { count: totalMachines },
    { count: pendingRequests },
    { count: activeCycles },
    { data: recentUsers },
    { data: recentRequests }
  ] = await Promise.all([
    supabase.from('admin_users').select('*', { count: 'exact', head: true }),
    supabase.from('locations').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('machines').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('location_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('cycles').select('*', { count: 'exact', head: true }).is('ended_at', null),
    supabase.from('admin_users').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('location_requests').select('*').order('created_at', { ascending: false }).limit(5)
  ]);

  return {
    totalUsers: totalUsers || 0,
    totalLocations: totalLocations || 0,
    totalMachines: totalMachines || 0,
    pendingRequests: pendingRequests || 0,
    activeCycles: activeCycles || 0,
    recentUsers: recentUsers || [],
    recentRequests: recentRequests || []
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

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
        <p className="text-red-600">Error loading dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {user?.email}. Here&apos;s what&apos;s happening with your laundry tracker.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">U</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalUsers || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">L</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Locations
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalLocations || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">M</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Machines
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalMachines || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">R</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.pendingRequests || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">C</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Cycles
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.activeCycles || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Users
            </h3>
            <div className="space-y-3">
              {stats?.recentUsers?.map((user: {id: string; email?: string; created_at?: string; role?: string}) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.role}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Location Requests
            </h3>
            <div className="space-y-3">
              {stats?.recentRequests?.map((request: {id: string; name: string; status: string; created_at?: string; address?: string}) => (
                <div key={request.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        request.status === 'pending' ? 'bg-yellow-100' :
                        request.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <span className={`text-xs font-medium ${
                          request.status === 'pending' ? 'text-yellow-700' :
                          request.status === 'approved' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {request.status.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {request.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.address}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
