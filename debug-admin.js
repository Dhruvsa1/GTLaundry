#!/usr/bin/env node

/**
 * Debug script to check admin user status
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugAdmin() {
  const email = 'ddhruvsai@outlook.com';
  const password = '@TesterAdmin1!';

  try {
    console.log('🔍 Debugging admin user...');
    
    // Step 1: Sign in
    console.log('📧 Step 1: Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) {
      console.error('❌ Sign in failed:', authError.message);
      return;
    }

    console.log('✅ Signed in successfully');
    console.log('   User ID:', authData.user.id);

    // Step 2: Check if user exists in admin_users table (without .single())
    console.log('🔍 Step 2: Checking admin_users table (without .single())...');
    const { data: adminDataAll, error: adminErrorAll } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', authData.user.id);

    console.log('Admin query result:', { adminDataAll, adminErrorAll });

    // Step 3: Try with .single()
    console.log('🔍 Step 3: Trying with .single()...');
    const { data: adminDataSingle, error: adminErrorSingle } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    console.log('Admin query with .single() result:', { adminDataSingle, adminErrorSingle });

    // Step 4: Check what's actually in the admin_users table
    console.log('🔍 Step 4: Checking all records in admin_users table...');
    const { data: allAdmins, error: allAdminsError } = await supabase
      .from('admin_users')
      .select('*');

    console.log('All admin users:', { allAdmins, allAdminsError });

    // Step 5: Try a different approach - check if the user ID exists
    console.log('🔍 Step 5: Checking if user ID exists in any form...');
    const { data: userExists, error: userExistsError } = await supabase
      .from('admin_users')
      .select('id, role, created_at')
      .eq('id', authData.user.id);

    console.log('User exists check:', { userExists, userExistsError });

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugAdmin();
