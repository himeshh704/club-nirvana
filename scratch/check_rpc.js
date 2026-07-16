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

async function checkRpc() {
  const { data, error } = await supabase.rpc('exec_sql', { query: "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Complimentary', ADD COLUMN IF NOT EXISTS collected_by text DEFAULT 'Super Admin';" });
  console.log('RPC result:', { data, error });
}

checkRpc();
