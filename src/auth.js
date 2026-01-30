// src/auth.js
import { supabase } from "./supabaseClient";

// Signup function
export async function signUpUser(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Signup error:", error.message);
    return { error: error.message };
  }

  return { data };
}
