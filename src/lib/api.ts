import { supabaseBrowser } from "./supabase";

export type Location = { id: string; name: string; address: string; timezone: string | null };
export type Machine = {
  id: string;
  location_id: string;
  label: string;
  type: "washer" | "dryer";
  status: "available" | "running" | "finished" | "offline";
  cycle_started_at: string | null;
  cycle_ends_at: string | null;
};

export async function fetchLocations(): Promise<Location[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.from("locations").select("*").order("name");
  if (error) throw error;
  return data as Location[];
}

export async function fetchMachines(locationId: string): Promise<Machine[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("machines")
    .select("*")
    .eq("location_id", locationId)
    .order("label");
  if (error) throw error;
  return data as Machine[];
}
