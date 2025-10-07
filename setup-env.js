#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment variables...\n');

// Check if .env.local already exists
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local already exists');
  console.log('📝 Please edit .env.local with your actual Supabase credentials\n');
} else {
  // Create .env.local with placeholder values
  const envContent = `# Supabase - Replace with your actual values
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key

# Web Push (VAPID) - Generate with: node -e "const webpush=require('web-push');console.log(webpush.generateVAPIDKeys())"
WEB_PUSH_PUBLIC_VAPID_KEY=placeholder-public-key
WEB_PUSH_PRIVATE_VAPID_KEY=placeholder-private-key
WEB_PUSH_CONTACT=mailto:you@example.com

# Client-side VAPID key (same as WEB_PUSH_PUBLIC_VAPID_KEY)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=placeholder-public-key`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local with placeholder values');
}

console.log('📋 Next steps:');
console.log('1. Create a Supabase project at https://supabase.com');
console.log('2. Copy your project URL and anon key to .env.local');
console.log('3. Generate VAPID keys: node -e "const webpush=require(\\'web-push\\');console.log(webpush.generateVAPIDKeys())"');
console.log('4. Update .env.local with the generated VAPID keys');
console.log('5. Run the SQL schema in Supabase SQL Editor (see supabase/schema.sql)');
console.log('\n🚀 Then restart your dev server: npm run dev');
