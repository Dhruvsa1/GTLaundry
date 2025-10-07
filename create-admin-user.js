#!/usr/bin/env node

/**
 * Script to create an admin user account
 * 
 * Usage: node create-admin-user.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Make sure .env.local exists with:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  const email = 'ddhruvsai@outlook.com';
  const password = '@TesterAdmin1!';

  try {
    console.log('🔍 Creating admin user account...');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    
    // Create the user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Auto-confirm email
    });

    if (authError) {
      console.error('❌ Error creating user account:', authError.message);
      process.exit(1);
    }

    console.log('✅ User account created successfully!');
    console.log('🆔 User ID:', authData.user.id);

    // Make the user a super admin
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert({
        id: authData.user.id,
        role: 'super_admin'
      });

    if (adminError) {
      console.error('❌ Error creating admin user:', adminError.message);
      console.error('User account was created but admin privileges failed.');
      process.exit(1);
    }

    console.log('🎉 Admin user created successfully!');
    console.log('👑 Role: Super Admin');
    console.log('');
    console.log('🚀 You can now:');
    console.log('   1. Go to your app and click "Sign In"');
    console.log('   2. Use the credentials:');
    console.log('      Email: ddhruvsai@outlook.com');
    console.log('      Password: @TesterAdmin1!');
    console.log('   3. Access the admin dashboard at /admin');
    console.log('');
    console.log('✨ All admin features are now available to you!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
