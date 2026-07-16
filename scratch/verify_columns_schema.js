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

const supabaseAdmin = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select('id, ticket_type, payment_method, collected_by')
    .limit(1);

  if (error) {
    console.error('Error selecting new columns:', error.message);
  } else {
    console.log('Successfully queried tickets table including payment_method and collected_by! Columns exist and work cleanly!');
  }
}

checkSchema();
