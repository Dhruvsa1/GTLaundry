#!/usr/bin/env node

/**
 * Check what user IDs exist and their admin status
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserIds() {
  try {
    console.log('🔍 Checking all users and their admin status...');
    
    // Get all users
    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 100
    });

    if (usersError) {
      console.error('❌ Error listing users:', usersError.message);
      return;
    }

    console.log('📧 All users:');
    allUsers.users.forEach(user => {
      console.log(`   ${user.email} - ID: ${user.id}`);
    });

    // Get all admin users
    const { data: allAdmins, error: adminsError } = await supabase
      .from('admin_users')
      .select('*');

    if (adminsError) {
      console.error('❌ Error listing admin users:', adminsError.message);
      return;
    }

    console.log('\n👑 All admin users:');
    allAdmins.forEach(admin => {
      console.log(`   ID: ${admin.id} - Role: ${admin.role}`);
    });

    // Check specific user IDs
    const userIds = ['4d55f4ab-5a1f-4fc1-a6d5-689f6cef0205', '8e9ad045-62c8-4751-839e-bcfd75a609ad'];
    
    console.log('\n🔍 Checking specific user IDs:');
    for (const userId of userIds) {
      const user = allUsers.users.find(u => u.id === userId);
      const admin = allAdmins.find(a => a.id === userId);
      
      console.log(`   ${userId}:`);
      console.log(`     Auth user: ${user ? user.email : 'Not found'}`);
      console.log(`     Admin user: ${admin ? admin.role : 'Not found'}`);
    }

    // Find the user with email ddhruvsai@outlook.com
    const targetUser = allUsers.users.find(u => u.email === 'ddhruvsai@outlook.com');
    if (targetUser) {
      console.log(`\n🎯 Target user (ddhruvsai@outlook.com):`);
      console.log(`   ID: ${targetUser.id}`);
      const targetAdmin = allAdmins.find(a => a.id === targetUser.id);
      console.log(`   Admin role: ${targetAdmin ? targetAdmin.role : 'Not admin'}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkUserIds();
