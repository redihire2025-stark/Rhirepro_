import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: jobs, error } = await supabase.from('jobs').select('*').limit(5);
  if (error) {
    console.error("Error fetching jobs:", error);
  } else {
    console.log(`First few jobs:`);
    jobs.forEach(j => {
      console.log(`- ${j.id}: "${j.title}" by company "${j.company_name}" (recruiter_id: ${j.recruiter_id})`);
    });
  }
}

check();
