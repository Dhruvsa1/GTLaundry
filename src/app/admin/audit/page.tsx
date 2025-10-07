"use client";
import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase";
import { useState, useMemo } from "react";

async function fetchAuditLog() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  
  // Add placeholder admin data since we can't access auth.users directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data?.map((log: any) => ({
    ...log,
    admin: {
      email: `Admin ${log.admin_id.slice(0, 8)}...`
    }
  })) || [];
}

export default function AdminAuditPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const { data: auditLog, isLoading, error } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: fetchAuditLog
  });

  // Filter and search logic
  const filteredLogs = useMemo(() => {
    if (!auditLog) return [];

    let filtered = auditLog;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.admin?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(log => new Date(log.created_at) >= filterDate);
    }

    return filtered;
  }, [auditLog, searchTerm, actionFilter, dateFilter]);

  // Get unique actions for filter dropdown
  const uniqueActions = useMemo(() => {
    if (!auditLog) return [];
    return [...new Set(auditLog.map(log => log.action))].sort();
  }, [auditLog]);

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
        <p className="text-red-600">Error loading audit log</p>
      </div>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'promote_user':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'demote_user':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'update_user_role':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approve_request':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reject_request':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'create_location':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delete_machine':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'promote_user':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
        );
      case 'demote_user':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"/>
          </svg>
        );
      case 'approve_request':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        );
      case 'reject_request':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V8z" clipRule="evenodd"/>
          </svg>
        );
    }
  };

  const formatActionData = (action: string, oldData: unknown, newData: unknown) => {
    switch (action) {
      case 'promote_user':
        return `Promoted to ${(newData as {role?: string})?.role || 'admin'}`;
      case 'demote_user':
        return `Removed admin privileges`;
      case 'update_user_role':
        return `Changed from ${(oldData as {role?: string})?.role || 'unknown'} to ${(newData as {role?: string})?.role || 'unknown'}`;
      case 'approve_request':
        return `Approved location request`;
      case 'reject_request':
        return `Rejected location request`;
      case 'create_location':
        return `Created new location`;
      case 'delete_machine':
        return `Deleted machine`;
      default:
        return action.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Audit Log</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track all admin actions and changes made to the system.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredLogs.length} of {auditLog?.length || 0} entries
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="Search actions, admins, or targets..."
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <label htmlFor="action-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Action Type
            </label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <select
              id="date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Entries */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Audit Log Entries ({filteredLogs.length})
          </h3>
        </div>
        
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No audit entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {/* Action Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {log.target_type && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {log.target_type}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Admin:</span> {log.admin?.email || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Action:</span> {formatActionData(log.action, log.old_data, log.new_data)}
                      </p>
                      {log.target_id && (
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Target ID:</span> {log.target_id.slice(0, 8)}...
                        </p>
                      )}
                    </div>

                    {/* Data Changes */}
                    {(log.old_data || log.new_data) && (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowDetails(showDetails === log.id ? null : log.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {showDetails === log.id ? 'Hide Details' : 'Show Details'}
                        </button>
                        
                        {showDetails === log.id && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.old_data && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-red-800 mb-2">Before</h4>
                                <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(log.old_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_data && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-green-800 mb-2">After</h4>
                                <pre className="text-xs text-green-700 whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(log.new_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
