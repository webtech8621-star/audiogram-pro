// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xdswpnonbrbgqwcfzvzu.supabase.co"; // from Supabase dashboard
const supabaseAnonKey = "sb_publishable_RF_Wx6burqzMpOIkrMbOpg_lWocTaaV "; // from Supabase dashboard

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
