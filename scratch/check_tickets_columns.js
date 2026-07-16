const fs = require('fs');
const { createClient } = require('c:/Users/choud/.gemini/antigravity-ide/scratch/event-ticketing-system/node_modules/@supabase/supabase-js');

const envContent = fs.readFileSync('c:/Users/choud/.gemini/antigravity-ide/scratch/event-ticketing-system/.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2 && !line.trim().startsWith('#')) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
  const { data, error } = await supabase.from('tickets').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in tickets table:', Object.keys(data[0]));
  } else {
    console.log('Tickets table is currently empty or no rows returned.');
  }
}

checkColumns();
