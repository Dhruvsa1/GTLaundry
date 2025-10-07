import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import webpush from "web-push";

export async function POST() {
  // Validate and set VAPID details inside the function to avoid build-time issues
  try {
    const contact = process.env.WEB_PUSH_CONTACT;
    const publicKey = process.env.WEB_PUSH_PUBLIC_VAPID_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_VAPID_KEY;

    if (!contact || !publicKey || !privateKey) {
      return NextResponse.json(
        { ok: false, error: "Missing VAPID env. Set WEB_PUSH_CONTACT, WEB_PUSH_PUBLIC_VAPID_KEY, WEB_PUSH_PRIVATE_VAPID_KEY" },
        { status: 500 }
      );
    }

    // contact must be a valid URL (e.g., mailto:you@example.com or https://yourdomain.com/contact)
    if (!/^mailto:.+@.+\..+$/i.test(contact) && !/^https?:\/\//i.test(contact)) {
      return NextResponse.json(
        { ok: false, error: "WEB_PUSH_CONTACT must be a URL (e.g., mailto:you@example.com)" },
        { status: 400 }
      );
    }

    webpush.setVapidDetails(contact, publicKey, privateKey);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("subscriptions").select("*").limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ ok: false, error: "No subscriptions" }, { status: 400 });

  const sub = {
    endpoint: data[0].endpoint,
    keys: { p256dh: data[0].p256dh, auth: data[0].auth }
  };

  try {
    await webpush.sendNotification(
      sub as webpush.PushSubscription,
      JSON.stringify({ title: "Laundry Test", body: "Hello from web push!", data: { url: "/" } })
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
