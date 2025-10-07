"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

export default function Navigation() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        console.log('No user, setting admin to false');
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      console.log('Checking admin status for user:', user.id, user.email);

      try {
        const supabase = supabaseBrowser();
        const { data, error } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .single();

        console.log('Admin query result:', { data, error });

        if (error || !data) {
          console.log('Admin query failed or no data:', error);
          setIsAdmin(false);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log('Admin query successful, role:', (data as any).role);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setIsAdmin(['admin', 'super_admin'].includes((data as any).role));
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const handleSignOut = async () => {
    router.push("/logout");
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Laundry Tracker
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Locations
            </Link>
            <Link 
              href="/settings" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Settings
            </Link>
            <Link 
              href="/request-location" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Request Location
            </Link>
            {isAdmin && (
              <Link 
                href="/admin" 
                className="text-purple-600 hover:text-purple-900 px-3 py-2 rounded-md text-sm font-medium font-semibold"
              >
                👑 Admin Dashboard
              </Link>
            )}
            
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {user.email}
                  </span>
                  {adminLoading && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Loading...
                    </span>
                  )}
                  {!adminLoading && isAdmin && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      👑 Admin
                    </span>
                  )}
                  {!adminLoading && !isAdmin && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                      Not Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
