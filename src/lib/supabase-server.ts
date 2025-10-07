import { createClient } from "@supabase/supabase-js";

export const supabaseServer = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Use service role on the server to bypass RLS for trusted operations
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
};
