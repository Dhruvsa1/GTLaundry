"use client";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ReactNode, useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { AuthProvider } from "./AuthProvider";

function RealtimeInvalidator() {
  const qc = useQueryClient();
  const subRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    subRef.current = supabase;

    const channel = supabase
      .channel("machines-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, () => {
        // Invalidate machine lists and machine detail queries
        qc.invalidateQueries({ queryKey: ["machines"] });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [qc]);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }
  return (
    <QueryClientProvider client={queryClientRef.current}>
      <AuthProvider>
        <RealtimeInvalidator />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
