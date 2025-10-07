import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    if (!['user', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be user, admin, or super_admin' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Use the database function to promote user
    const { error } = await supabase.rpc('promote_user_to_admin', {
      target_user_id: userId,
      new_role: role
    });

    if (error) {
      console.error('Error promoting user:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `User successfully promoted to ${role}` });
  } catch (error) {
    console.error('Error in promote user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
