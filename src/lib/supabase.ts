"use client";
import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

// Get the current origin for redirect URLs
const getRedirectUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};

export const supabaseBrowser = () => {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { 
        auth: { 
          persistSession: true, 
          autoRefreshToken: true
          // redirectTo is not supported in this version of Supabase
        } 
      }
    );
  }
  return browserClient;
};
