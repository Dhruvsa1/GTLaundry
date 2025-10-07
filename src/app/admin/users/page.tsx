"use client";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

async function fetchAdminUsers() {
  try {
    const response = await fetch('/api/admin/users/list');
    if (!response.ok) {
      throw new Error('Failed to fetch admin users');
    }
    const data = await response.json();
    return data.adminUsers || [];
  } catch (error) {
    console.error('Error fetching admin users:', error);
    // Fallback to direct database query
    const supabase = supabaseBrowser();
    const { data, error: dbError } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data?.map((adminUser: any) => ({
      ...adminUser,
      user: {
        email: `User ${adminUser.id.slice(0, 8)}...`,
        created_at: adminUser.created_at
      }
    })) || [];
  }
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
  const [selectedRole, setSelectedRole] = useState<'admin' | 'super_admin'>('admin');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

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

  const handlePromote = async (userId: string, role: 'admin' | 'super_admin') => {
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

  const handleDemote = async (userId: string) => {
    if (!user) return;

    // Check if current user is super admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUserRole = adminUsers?.find((au: any) => au.id === user.id)?.role;
    if (currentUserRole !== 'super_admin') {
      alert('Only super admins can demote other admins.');
      return;
    }

    // Check if trying to demote self
    if (userId === user.id) {
      alert("You cannot demote yourself!");
      return;
    }

    // Check if trying to demote another super admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetUser = adminUsers?.find((au: any) => au.id === userId);
    if (targetUser?.role === 'super_admin') {
      alert("You cannot demote another super admin!");
      return;
    }

    if (!confirm("Are you sure you want to remove admin privileges from this user?")) {
      return;
    }

    try {
      const supabase = supabaseBrowser();
      
      // Get the current admin data for audit log
      const { data: currentAdmin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .single();

      // Delete from admin_users table
      const { error: deleteError } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      // Log the action in audit log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: auditError } = await (supabase as any)
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'demote_user',
          target_type: 'user',
          target_id: userId,
          old_data: currentAdmin
        });

      if (auditError) console.error('Audit log error:', auditError);

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      alert('User successfully demoted to regular user!');
    } catch (error) {
      console.error('Error demoting user:', error);
      alert('Error demoting user. Please try again.');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'super_admin') => {
    if (!user) return;

    // Check if current user is super admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUserRole = adminUsers?.find((au: any) => au.id === user.id)?.role;
    if (currentUserRole !== 'super_admin') {
      alert('Only super admins can change user roles.');
      return;
    }

    // Check if trying to modify self
    if (userId === user.id) {
      alert("You cannot change your own role!");
      return;
    }

    // Check if trying to modify another super admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetUser = adminUsers?.find((au: any) => au.id === userId);
    if (targetUser?.role === 'super_admin') {
      alert("You cannot modify another super admin's role!");
      return;
    }

    if (!confirm(`Are you sure you want to change this user's role to ${newRole === 'super_admin' ? 'Super Admin' : 'Admin'}?`)) {
      return;
    }

    try {
      const supabase = supabaseBrowser();
      
      // Get the current admin data for audit log
      const { data: currentAdmin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .single();

      // Update the role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('admin_users')
        .update({ role: newRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Log the action in audit log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: auditError } = await (supabase as any)
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'update_user_role',
          target_type: 'user',
          target_id: userId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          old_data: { role: (currentAdmin as any)?.role },
          new_data: { role: newRole }
        });

      if (auditError) console.error('Audit log error:', auditError);

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      alert(`User role successfully updated to ${newRole === 'super_admin' ? 'Super Admin' : 'Admin'}!`);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role. Please try again.');
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Users Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage admin users and their roles. Only super admins can create and modify admin users.
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
          {filteredUsers.length} admin users
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
            <p className="mt-2 text-sm text-gray-500">No admin users found</p>
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
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <p>ID: {adminUser.id.slice(0, 8)}...</p>
                        <p>Created: {new Date(adminUser.created_at).toLocaleDateString()}</p>
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
                          {adminUser.role !== 'super_admin' && (
                            <button
                              onClick={() => handleUpdateRole(adminUser.id, 'super_admin')}
                              className="text-purple-600 hover:text-purple-800 text-sm font-medium px-3 py-1 rounded-md hover:bg-purple-50 transition-colors"
                            >
                              Make Super Admin
                            </button>
                          )}
                          {adminUser.role !== 'admin' && (
                            <button
                              onClick={() => handleUpdateRole(adminUser.id, 'admin')}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                            >
                              Make Admin
                            </button>
                          )}
                          <button
                            onClick={() => handleDemote(adminUser.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                          >
                            Remove Admin
                          </button>
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
