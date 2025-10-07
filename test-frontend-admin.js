#!/usr/bin/env node

/**
 * Test script to simulate frontend admin query
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFrontendAdminQuery() {
  const email = 'ddhruvsai@outlook.com';
  const password = '@TesterAdmin1!';

  try {
    console.log('🔍 Testing frontend admin query...');
    
    // First, sign in as the user (simulating frontend)
    console.log('📧 Signing in as user...');
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

    // Now test the exact query that the frontend uses
    console.log('🔍 Testing admin_users query...');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (adminError) {
      console.error('❌ Admin query failed:', adminError.message);
      console.error('   Error details:', adminError);
      return;
    }

    console.log('✅ Admin query successful:');
    console.log('   Role:', adminData.role);
    console.log('   Is Admin:', ['admin', 'super_admin'].includes(adminData.role));

    // Test the is_admin function
    console.log('🔍 Testing is_admin function...');
    const { data: isAdminData, error: isAdminError } = await supabase
      .rpc('is_admin');

    if (isAdminError) {
      console.error('❌ is_admin function failed:', isAdminError.message);
    } else {
      console.log('✅ is_admin function result:', isAdminData);
    }

    console.log('');
    console.log('🎉 Frontend admin detection should work!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testFrontendAdminQuery();
