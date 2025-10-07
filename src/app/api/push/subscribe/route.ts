import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { endpoint, keys, user_id, platform } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = supabaseServer();
  // Use upsert to avoid unique constraint errors when the same browser re-subscribes
  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        platform: platform ?? "web",
        user_id: user_id ?? null,
      },
      { onConflict: "endpoint" }
    );

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
