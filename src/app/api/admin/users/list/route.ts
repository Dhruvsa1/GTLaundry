import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = supabaseServer();

    // Use the new function to get all users with their admin status
    const { data: allUsers, error } = await supabase.rpc('get_all_users');

    if (error) {
      console.error('Error fetching all users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const usersWithAdminStatus = allUsers.map((user: any) => ({
      id: user.id,
      role: user.admin_role,
      created_at: user.created_at,
      updated_at: user.created_at, // Use created_at as updated_at for now
      user: {
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        is_active: user.is_active
      }
    }));

    return NextResponse.json({ adminUsers: usersWithAdminStatus });
  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
