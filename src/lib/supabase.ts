"use client";
import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

// Get the current origin for redirect URLs (currently unused but kept for future use)
// const getRedirectUrl = () => {
//   if (typeof window !== 'undefined') {
//     return `${window.location.origin}/auth/callback`;
//   }
//   return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
// };

export const supabaseBrowser = () => {
  if (!browserClient) {
    // Debug logging for production
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key (first 20 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20));
    
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
