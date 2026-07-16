const fs = require('fs');
const envContent = fs.readFileSync('c:/Users/choud/.gemini/antigravity-ide/scratch/event-ticketing-system/.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2 && !line.trim().startsWith('#')) {
    console.log('Env key:', parts[0].trim());
  }
});
