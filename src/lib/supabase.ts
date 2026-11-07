import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Orders and admin will not work.",
  );
}

// Placeholders stop a missing config from crashing every page that imports this
// module. Requests made with them fail and return an error to the caller.
export const supabase = createClient(
  supabaseUrl || "http://supabase-not-configured.invalid",
  supabaseAnonKey || "not-configured",
);

export type Product = {
  id: string;
  sku: string;
  name: string;
  name_ar: string | null;
  image_url: string | null;
  pieces_per_carton: number;
  unit_price_b2c: number;
  carton_price_b2c: number | null;
  is_active: boolean;
  sort_order: number | null;
};
