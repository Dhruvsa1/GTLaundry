import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = supabaseServer();

    // Get admin users from admin_users table
    const { data: adminUsers, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin users:', error);
      return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 });
    }

    // Get real email addresses for each admin user
    const adminUsersWithEmails = await Promise.all(
      adminUsers.map(async (adminUser) => {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(adminUser.id);
          return {
            ...adminUser,
            user: {
              email: userData.user?.email || 'Unknown',
              created_at: userData.user?.created_at || adminUser.created_at
            }
          };
        } catch (error) {
          console.error(`Error fetching user details for ${adminUser.id}:`, error);
          return {
            ...adminUser,
            user: {
              email: `User ${adminUser.id.slice(0, 8)}...`,
              created_at: adminUser.created_at
            }
          };
        }
      })
    );

    return NextResponse.json({ adminUsers: adminUsersWithEmails });
  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
