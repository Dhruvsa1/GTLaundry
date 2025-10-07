# Quick Setup Guide

## 🚨 Current Issue
The app is showing "supabaseUrl is required" because environment variables aren't configured yet.

## ✅ Quick Fix

### 1. Set up Supabase (Required)
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key from the project settings
3. Edit `.env.local` and replace the placeholder values:
   ```bash
   # Replace these with your actual Supabase values
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 2. Generate VAPID Keys (For Push Notifications)
```bash
node -e "const webpush=require('web-push');console.log(webpush.generateVAPIDKeys())"
```
Copy the generated keys to `.env.local`:
```bash
WEB_PUSH_PUBLIC_VAPID_KEY=your-generated-public-key
WEB_PUSH_PRIVATE_VAPID_KEY=your-generated-private-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-generated-public-key
```

### 3. Set up Database
1. Go to your Supabase project dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Run the SQL to create tables and seed data

### 4. Restart the App
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## 🎉 After Setup
- Visit `http://localhost:3000` to see the locations
- Go to `/settings` to test push notifications
- The app will show real data from Supabase

## 📱 iOS Development
```bash
npm run build
npx cap sync ios
npx cap open ios
```
