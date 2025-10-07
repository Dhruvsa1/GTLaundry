"use client";
import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase";
import { useState } from "react";

async function fetchAnalytics() {
  const supabase = supabaseBrowser();
  
  // Fetch comprehensive analytics data
  const [
    { count: totalUsers },
    { count: totalAdmins },
    { count: totalLocations },
    { count: totalMachines },
    { count: totalCycles },
    { count: pendingRequests },
    { count: approvedRequests },
    { count: rejectedRequests },
    { data: recentActivity },
    { data: userRegistrations },
    { data: cycleData },
    { data: locationData },
    { data: machineData }
  ] = await Promise.all([
    supabase.from('admin_users').select('*', { count: 'exact', head: true }),
    supabase.from('admin_users').select('*', { count: 'exact', head: true }).in('role', ['admin', 'super_admin']),
    supabase.from('locations').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('machines').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('cycles').select('*', { count: 'exact', head: true }),
    supabase.from('location_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('location_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('location_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('user_analytics').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('admin_users').select('created_at').order('created_at', { ascending: false }).limit(30),
    supabase.from('cycles').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('locations').select('*').eq('is_active', true),
    supabase.from('machines').select('*').eq('is_active', true)
  ]);

  // Calculate daily usage for last 30 days
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  });

  const dailyUsage = last30Days.map(date => {
    const dayCycles = cycleData?.filter((cycle: {created_at?: string}) => 
      cycle?.created_at?.startsWith(date)
    ).length || 0;
    return { date, cycles: dayCycles };
  }).reverse();

  // Calculate machine utilization
  const machineUtilization = machineData?.map((machine: {id: string; name: string; location_id: string}) => {
    const machineCycles = cycleData?.filter((cycle: {machine_id?: string}) => cycle.machine_id === machine.id).length || 0;
    return {
      id: machine.id,
      name: machine.name,
      location: (locationData as Array<{id: string; name: string}> | undefined)?.find(loc => loc.id === machine.location_id)?.name || 'Unknown',
      cycles: machineCycles,
      utilization: machineCycles / Math.max(1, totalCycles || 1) * 100
    };
  }).sort((a, b) => b.cycles - a.cycles) || [];

  return {
    totalUsers: totalUsers || 0,
    totalAdmins: totalAdmins || 0,
    totalLocations: totalLocations || 0,
    totalMachines: totalMachines || 0,
    totalCycles: totalCycles || 0,
    pendingRequests: pendingRequests || 0,
    approvedRequests: approvedRequests || 0,
    rejectedRequests: rejectedRequests || 0,
    recentActivity: recentActivity || [],
    userRegistrations: userRegistrations || [],
    dailyUsage,
    machineUtilization,
    locationData: locationData || [],
    cycleData: cycleData || []
  };
}

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['admin-analytics', timeRange],
    queryFn: fetchAnalytics,
    refetchInterval: 60000 // Refresh every minute
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
        <p className="text-red-600">Error loading analytics data</p>
      </div>
    );
  }

  // Calculate user registration trends
  // const registrationTrend = analytics?.userRegistrations?.map(reg => ({
  //   date: reg.created_at.split('T')[0],
  //   count: 1
  // })).reduce((acc, curr) => {
  //   const existing = acc.find(item => item.date === curr.date);
  //   if (existing) {
  //     existing.count += 1;
  //   } else {
  //     acc.push(curr);
  //   }
  //   return acc;
  // }, [] as { date: string; count: number }[]) || [];

  const maxCycles = Math.max(...(analytics?.dailyUsage?.map(d => d.cycles) || [0]));
  // const maxRegistrations = Math.max(...(registrationTrend.map(r => r.count)));

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Comprehensive overview of system usage, user activity, and key metrics.
          </p>
        </div>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold">{analytics?.totalUsers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h-6v4a2 2 0 01-2 2H9.5a2 2 0 01-2-2V9H1V8a5 5 0 0110 0v1z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Active Locations */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Locations</p>
              <p className="text-3xl font-bold">{analytics?.totalLocations || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-400 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Total Machines */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Machines</p>
              <p className="text-3xl font-bold">{analytics?.totalMachines || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-400 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V8z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Total Cycles */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Total Cycles</p>
              <p className="text-3xl font-bold">{analytics?.totalCycles || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-400 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Request Status Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.pendingRequests || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Approved Requests</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.approvedRequests || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Rejected Requests</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.rejectedRequests || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Usage (Last 30 Days)</h3>
          <div className="space-y-3">
            {analytics?.dailyUsage?.slice(-7).map((day) => (
              <div key={day.date} className="flex items-center space-x-3">
                <div className="w-16 text-xs text-gray-500">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.max(5, (day.cycles / Math.max(maxCycles, 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="w-8 text-xs text-gray-700 text-right font-medium">
                  {day.cycles}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Machine Utilization */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Machines</h3>
          <div className="space-y-3">
            {analytics?.machineUtilization?.slice(0, 5).map((machine, index) => (
              <div key={machine.id} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{machine.name}</p>
                  <p className="text-xs text-gray-500">{machine.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{machine.cycles}</p>
                  <p className="text-xs text-gray-500">cycles</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          {analytics?.recentActivity?.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No recent activity recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics?.recentActivity?.slice(0, 8).map((activity: {id: string; event_type: string; created_at: string; user_id?: string; details?: string}) => (
                <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-700">
                        {activity.event_type.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {activity.event_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-500">
                      User: {activity.user_id?.slice(0, 8) || 'Unknown'}...
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
