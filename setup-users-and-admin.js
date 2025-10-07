#!/usr/bin/env node

// Script to set up users table and promote users to admin
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Make sure .env.local exists with:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupUsersAndAdmins() {
  console.log('🔧 Setting up users table and admin roles...\n');
  
  // First, let's see what users exist in auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError.message);
    return;
  }
  
  if (!authUsers.users || authUsers.users.length === 0) {
    console.log('❌ No users found. Please create a user account first by logging in to your app.');
    return;
  }
  
  console.log('📋 Found auth users:');
  authUsers.users.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email} (${user.id})`);
  });
  
  // Check if users table exists and has data
  const { data: existingUsers, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .limit(5);
    
  if (usersError) {
    console.log('⚠️  Users table not found. You need to run the users-schema.sql first.');
    console.log('   Go to Supabase Dashboard → SQL Editor and run supabase/users-schema.sql');
    return;
  }
  
  console.log('\n📋 Found users in public.users table:');
  if (existingUsers.length === 0) {
    console.log('   No users found in public.users table');
  } else {
    existingUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.id})`);
    });
  }
  
  // Check existing admin users
  const { data: existingAdmins, error: adminsError } = await supabase
    .from('admin_users')
    .select('id, role')
    .order('created_at');
    
  console.log('\n👑 Current admin users:');
  if (existingAdmins.length === 0) {
    console.log('   No admin users found');
  } else {
    existingAdmins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.id} - ${admin.role}`);
    });
  }
  
  // Find users who aren't admins yet
  const nonAdminUsers = authUsers.users.filter(authUser => 
    !existingAdmins.some(admin => admin.id === authUser.id)
  );
  
  if (nonAdminUsers.length > 0) {
    console.log('\n🔧 Promoting users to super_admin...');
    
    for (const user of nonAdminUsers) {
      console.log(`   Promoting ${user.email} to super_admin...`);
      
      const { data, error } = await supabase
        .from('admin_users')
        .upsert({
          id: user.id,
          role: 'super_admin',
          created_by: existingAdmins[0]?.id || null // Use existing admin as creator, or null for first admin
        }, {
          onConflict: 'id'
        });
        
      if (error) {
        console.error(`   ❌ Error promoting ${user.email}:`, error.message);
      } else {
        console.log(`   ✅ Successfully promoted ${user.email} to super_admin`);
      }
    }
  } else {
    console.log('\n✅ All users are already admins');
  }
  
  // Final verification
  const { data: finalAdmins, error: finalError } = await supabase
    .from('admin_users')
    .select('id, role, created_at')
    .order('created_at');
    
  if (finalError) {
    console.error('❌ Error fetching final admin list:', finalError.message);
    return;
  }
  
  console.log('\n🎉 Final admin users:');
  finalAdmins.forEach((admin, index) => {
    console.log(`   ${index + 1}. ${admin.id} - ${admin.role} (created: ${admin.created_at})`);
  });
  
  console.log('\n✅ Setup complete! All users are now super_admins.');
  console.log('   You can now promote/demote users from the admin dashboard.');
}

setupUsersAndAdmins().catch(console.error);
