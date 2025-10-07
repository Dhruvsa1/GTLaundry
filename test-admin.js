#!/usr/bin/env node

/**
 * Test script to verify admin user exists and can be queried
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminUser() {
  const email = 'ddhruvsai@outlook.com';

  try {
    console.log('🔍 Testing admin user setup...');
    
    // First, get the user from auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 100
    });

    if (authError) {
      console.error('❌ Error listing users:', authError.message);
      return;
    }

    const user = authData.users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ User not found in auth.users');
      return;
    }

    console.log('✅ User found in auth.users:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Created:', user.created_at);

    // Now check admin_users table
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (adminError) {
      console.error('❌ Error querying admin_users:', adminError.message);
      console.error('   This means the user is not in the admin_users table');
      return;
    }

    console.log('✅ User found in admin_users:');
    console.log('   Role:', adminData.role);
    console.log('   Created:', adminData.created_at);

    // Test the query that the frontend uses
    const { data: frontendQuery, error: frontendError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (frontendError) {
      console.error('❌ Frontend query failed:', frontendError.message);
      return;
    }

    console.log('✅ Frontend query successful:');
    console.log('   Role:', frontendQuery.role);
    console.log('   Is Admin:', ['admin', 'super_admin'].includes(frontendQuery.role));

    console.log('');
    console.log('🎉 Admin user is properly set up!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAdminUser();
