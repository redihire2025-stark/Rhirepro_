import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
  override: true,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  console.log("URL:", process.env.VITE_SUPABASE_URL);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "admin_org1@redhire.dev",
      password: "AdminRhire@2025",
    });
    if (error) {
      console.error("Sign in failed:", error.message, error.status);
    } else {
      console.log("Sign in successful!");
      console.log("User metadata:", data.user?.user_metadata);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
