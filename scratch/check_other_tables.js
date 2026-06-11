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
  const { data: recs } = await supabase.from('recruiter_profiles').select('*');
  console.log(`Found ${recs?.length || 0} recruiter profiles`);
  
  const { data: jobs } = await supabase.from('jobs').select('*');
  console.log(`Found ${jobs?.length || 0} jobs`);
  
  const { data: apps } = await supabase.from('applications').select('*');
  console.log(`Found ${apps?.length || 0} applications`);
}

check();
