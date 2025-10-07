#!/usr/bin/env node

/**
 * Script to make yourself an admin
 * 
 * Usage:
 * 1. First, sign up/login to your app to get your user ID
 * 2. Run: node make-admin.js YOUR_USER_ID
 * 
 * To get your user ID:
 * 1. Open browser dev tools on your app
 * 2. Go to Application > Local Storage > your-domain
 * 3. Look for supabase.auth.token and find the "sub" field (that's your user ID)
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

async function makeAdmin(userId) {
  if (!userId) {
    console.error('❌ Please provide a user ID');
    console.error('Usage: node make-admin.js YOUR_USER_ID');
    console.error('');
    console.error('To get your user ID:');
    console.error('1. Sign up/login to your app');
    console.error('2. Open browser dev tools');
    console.error('3. Go to Application > Local Storage');
    console.error('4. Look for supabase.auth.token and find the "sub" field');
    process.exit(1);
  }

  try {
    console.log('🔍 Checking if user exists...');
    
    // Check if user exists
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      console.error('❌ User not found. Make sure the user ID is correct.');
      console.error('Error:', userError?.message);
      process.exit(1);
    }
    
    console.log('✅ User found:', user.email);
    
    // Check if user is already an admin
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingAdmin) {
      console.log('⚠️  User is already an admin with role:', existingAdmin.role);
      console.log('Do you want to update to super_admin? (y/N)');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          const { error } = await supabase
            .from('admin_users')
            .update({ role: 'super_admin' })
            .eq('id', userId);
          
          if (error) {
            console.error('❌ Error updating admin role:', error.message);
          } else {
            console.log('✅ Successfully updated to super_admin!');
          }
        }
        rl.close();
      });
    } else {
      // Create admin user
      const { error } = await supabase
        .from('admin_users')
        .insert({
          id: userId,
          role: 'super_admin'
        });
      
      if (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
      }
      
      console.log('✅ Successfully created super_admin user!');
      console.log('🎉 You can now access the admin dashboard at /admin');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
makeAdmin(userId);
