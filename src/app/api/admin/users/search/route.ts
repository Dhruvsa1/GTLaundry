import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email || email.length < 3) {
      return NextResponse.json({ users: [] });
    }

    const supabase = supabaseServer();

    // Search for users by email using admin API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.auth.admin as any).listUsers({
      page: 1,
      perPage: 10,
      filter: `email.ilike.%${email}%`
    });

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    // Filter out users who are already admins
    const { data: existingAdmins } = await supabase
      .from('admin_users')
      .select('id');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingAdminIds = existingAdmins?.map((admin: any) => admin.id) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableUsers = data.users.filter((user: any) => !existingAdminIds.includes(user.id));

    return NextResponse.json({ users: availableUsers });
  } catch (error) {
    console.error('Error in user search API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
