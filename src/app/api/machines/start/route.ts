import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { machineId, minutes = 45 } = await req.json();
  if (!machineId) return NextResponse.json({ ok: false, error: "machineId required" }, { status: 400 });

  const supabase = supabaseServer();
  const endsAt = new Date(Date.now() + minutes * 60_000).toISOString();

  const { error } = await supabase
    .from("machines")
    .update({ status: "running", cycle_started_at: new Date().toISOString(), cycle_ends_at: endsAt })
    .eq("id", machineId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cycle_ends_at: endsAt });
}
