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
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error("Error querying profiles:", error);
  } else {
    console.log(`Found ${data.length} profiles:`);
    data.forEach(p => {
      console.log(`- ${p.id}: ${p.first_name} ${p.last_name} (${p.email}), notice: "${p.notice_period}", exp: "${p.total_experience}", salary: "${p.current_salary}" / "${p.expected_salary}"`);
      console.log(`  skills: ${JSON.stringify(p.skills)}`);
    });
  }
}

check();
