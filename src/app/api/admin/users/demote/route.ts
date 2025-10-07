import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Use the database function to demote user
    const { error } = await supabase.rpc('demote_admin_to_user', {
      target_user_id: userId
    });

    if (error) {
      console.error('Error demoting user:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'User successfully demoted to regular user' });
  } catch (error) {
    console.error('Error in demote user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
