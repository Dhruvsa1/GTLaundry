"use client";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

async function fetchAdminUsers() {
  // Query with the user's JWT context to satisfy auth.uid() checks
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.rpc('get_all_users');
  if (error) {
    console.error('get_all_users RPC failed:', error);
    throw new Error('Failed to fetch users');
  }
  // Shape into the structure the UI expects
  return (data || []).map((user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    is_active: boolean;
    admin_role: 'user' | 'admin' | 'super_admin';
    is_admin: boolean;
  }) => ({
    id: user.id,
    role: user.admin_role,
    created_at: user.created_at,
    user: {
      email: user.email,
      full_name: user.full_name,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      is_active: user.is_active,
    },
  }));
}

async function searchUsers(email: string) {
  if (!email || email.length < 3) return [];
  
  try {
    const response = await fetch('/api/admin/users/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Failed to search users');
    }

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{id: string; email?: string; created_at?: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{id: string; email?: string; created_at?: string} | null>(null);
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | 'super_admin'>('admin');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: adminUsers, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers
  });

  // Filter and sort logic
  const filteredUsers = useMemo(() => {
    if (!adminUsers) return [];

    let filtered = adminUsers;

    // Role filter
    if (filterRole !== "all") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filtered = filtered.filter((adminUser: any) => adminUser.role === filterRole);
    }

    // Sort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "email":
          return (a.user?.email || '').localeCompare(b.user?.email || '');
        case "role":
          return a.role.localeCompare(b.role);
        default:
          return 0;
      }
    });

    return filtered;
  }, [adminUsers, filterRole, sortBy]);

  const handlePromoteUser = async (userId: string, role: 'user' | 'admin' | 'super_admin') => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/users/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote user');
      }

      // Refresh the users list
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowPromoteModal(false);
      setSelectedUser(null);
      
      alert(`User successfully promoted to ${role}!`);
    } catch (error) {
      console.error('Error promoting user:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to promote user'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDemoteUser = async (userId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/users/demote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to demote user');
      }

      // Refresh the users list
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
      
      alert('User successfully demoted to regular user!');
    } catch (error) {
      console.error('Error demoting user:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to demote user'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = async (email: string) => {
    setSearchEmail(email);
    if (email.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const users = await searchUsers(email);
      // Filter out users who are already admins
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingAdminIds = adminUsers?.map((au: any) => au.id) || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filteredUsers = users.filter((u: any) => !existingAdminIds.includes(u.id));
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePromote = async (userId: string, role: 'user' | 'admin' | 'super_admin') => {
    if (!user) return;

    // Check if current user is super admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUserRole = adminUsers?.find((au: any) => au.id === user.id)?.role;
    if (currentUserRole !== 'super_admin') {
      alert('Only super admins can promote users to admin roles.');
      return;
    }

    try {
      const supabase = supabaseBrowser();
      
      // Insert into admin_users table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: adminError } = await (supabase as any)
        .from('admin_users')
        .insert({
          id: userId,
          role: role,
          created_by: user.id
        });

      if (adminError) throw adminError;

      // Log the action in audit log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: auditError } = await (supabase as any)
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'promote_user',
          target_type: 'user',
          target_id: userId,
          new_data: { role: role }
        });

      if (auditError) console.error('Audit log error:', auditError);

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowPromoteModal(false);
      setSelectedUser(null);
      setSearchEmail("");
      setSearchResults([]);
      
      alert(`User successfully promoted to ${role === 'super_admin' ? 'Super Admin' : 'Admin'}!`);
    } catch (error) {
      console.error('Error promoting user:', error);
      alert('Error promoting user. Please try again.');
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
        <p className="text-red-600">Error loading admin users</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Users Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            View all users and manage their admin roles. Only super admins can promote/demote users.
          </p>
          {(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentUserRole = adminUsers?.find((au: any) => au.id === user?.id)?.role;
            if (currentUserRole === 'super_admin') {
              return (
                <div className="mt-2 flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm text-green-600 font-medium">Super Admin - Full Access</span>
                </div>
              );
            } else if (currentUserRole === 'admin') {
              return (
                <div className="mt-2 flex items-center space-x-2">
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm text-yellow-600 font-medium">Admin - View Only</span>
                </div>
              );
            }
            return null;
          })()}
        </div>
        <div className="text-sm text-gray-500">
          {filteredUsers.length} total users
        </div>
      </div>

      {/* Promote New Admin */}
      {(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentUserRole = adminUsers?.find((au: any) => au.id === user?.id)?.role;
        if (currentUserRole !== 'super_admin') {
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <h3 className="text-lg font-semibold text-yellow-800">Access Restricted</h3>
              </div>
              <p className="mt-2 text-sm text-yellow-700">
                Only super admins can promote users to admin roles. Contact a super admin to request access.
              </p>
            </div>
          );
        }
        
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Promote User to Admin</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="search-email" className="block text-sm font-medium text-gray-700 mb-2">
              Search by Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="email"
                id="search-email"
                value={searchEmail}
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter user's email address..."
              />
            </div>
          </div>

          {isSearching && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Searching...</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Search Results:</p>
              {searchResults.map((searchUser) => (
                <div key={searchUser.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{searchUser.email}</p>
                    <p className="text-sm text-gray-500">
                      Joined: {searchUser.created_at ? new Date(searchUser.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(searchUser);
                      setShowPromoteModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Promote
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchEmail.length >= 3 && searchResults.length === 0 && !isSearching && (
            <p className="text-sm text-gray-500">No users found matching that email.</p>
          )}
        </div>
      </div>
        );
      })()}

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Role Filter */}
          <div>
            <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              id="role-filter"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
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
              <option value="email">Email A-Z</option>
              <option value="role">Role</option>
            </select>
          </div>

          {/* Quick Stats */}
          <div className="flex space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {filteredUsers.filter((u: any) => u.role === 'admin').length}
              </div>
              <div className="text-xs text-gray-500">Admins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {filteredUsers.filter((u: any) => u.role === 'super_admin').length}
              </div>
              <div className="text-xs text-gray-500">Super Admins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Admin Users */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Current Admin Users ({filteredUsers.length})
          </h3>
        </div>
        
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {filteredUsers.map((adminUser: any) => (
              <div key={adminUser.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {(adminUser.user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="text-lg font-medium text-gray-900">
                          {adminUser.user?.email || 'Unknown'}
                        </h4>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          adminUser.role === 'super_admin' 
                            ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                            : adminUser.role === 'admin'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {adminUser.role === 'super_admin' ? 'Super Admin' : 
                           adminUser.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <p>ID: {adminUser.id.slice(0, 8)}...</p>
                        <p>Created: {new Date(adminUser.created_at).toLocaleDateString()}</p>
                        {adminUser.user?.last_sign_in_at && (
                          <p>Last Sign In: {new Date(adminUser.user.last_sign_in_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {(() => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentUserRole = adminUsers?.find((au: any) => au.id === user?.id)?.role;
                      const isCurrentUser = adminUser.id === user?.id;
                      const isSuperAdmin = adminUser.role === 'super_admin';
                      const canModify = currentUserRole === 'super_admin' && !isCurrentUser && !isSuperAdmin;
                      
                      if (isCurrentUser) {
                        return <span className="text-sm text-gray-400 italic">Current User</span>;
                      }
                      
                      if (isSuperAdmin) {
                        return (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-400 italic">Protected</span>
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        );
                      }
                      
                      if (!canModify) {
                        return <span className="text-sm text-gray-400 italic">No Permission</span>;
                      }
                      
                      return (
                        <>
                          {adminUser.role === 'user' && (
                            <button
                              onClick={() => handlePromoteUser(adminUser.id, 'admin')}
                              disabled={isProcessing}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                            >
                              Make Admin
                            </button>
                          )}
                          {adminUser.role === 'admin' && (
                            <button
                              onClick={() => handleDemoteUser(adminUser.id)}
                              disabled={isProcessing}
                              className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              Demote to User
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promote Modal */}
      {showPromoteModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Promote User to Admin
                </h3>
                <button
                  onClick={() => {
                    setShowPromoteModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedUser.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedUser.email}</p>
                    <p className="text-sm text-gray-500">
                      Joined: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'super_admin')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedRole === 'super_admin' 
                    ? 'Can manage other admins and access all features'
                    : 'Can manage locations, requests, and analytics'
                  }
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPromoteModal(false);
                    setSelectedUser(null);
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePromote(selectedUser.id, selectedRole)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Promote to {selectedRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
