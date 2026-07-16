const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('c:/Users/choud/.gemini/antigravity-ide/scratch/event-ticketing-system/node_modules/@supabase/supabase-js');

const envContent = fs.readFileSync('c:/Users/choud/.gemini/antigravity-ide/scratch/event-ticketing-system/.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2 && !line.trim().startsWith('#')) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkOrAddColumns() {
  console.log('Checking if tickets table has payment_method and collected_by columns...');
  // Try inserting a dummy ticket with payment_method and collected_by or selecting them
  const { data, error } = await supabase.from('tickets').select('id, payment_method, collected_by').limit(1);
  if (error) {
    console.log('Select error (column might not exist):', error.message);
  } else {
    console.log('Columns exist or query succeeded:', data);
  }
}

checkOrAddColumns();
