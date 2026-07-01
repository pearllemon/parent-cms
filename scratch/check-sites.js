import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in env!');
  process.exit(1);
}

console.log('Connecting to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: sites, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) {
    console.error('Error fetching site_settings:', error);
    return;
  }

  console.log('Found site_settings:');
  sites.forEach(s => {
    console.log(`ID: ${s.id}, SiteID: ${s.site_id}, Name: ${s.site_name || s.site_title}, Domain: ${s.domain_name || s.site_url}`);
  });
}

run();
