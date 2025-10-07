# Laundry Tracker — Campus Laundry Machine Availability

A realtime campus laundry tracker built with Next.js, TypeScript, Tailwind CSS, Supabase, and Capacitor for iOS.

## Features

- 🏠 **Location Management**: View all laundry locations on campus
- 🧺 **Machine Status**: Real-time status of washers and dryers
- 📱 **PWA Support**: Install as a web app with offline capabilities
- 🔔 **Push Notifications**: Get notified when machines are available
- 📱 **iOS App**: Native iOS app via Capacitor
- ⚡ **Real-time Updates**: Live updates using Supabase realtime

## Quickstart

### 1. Install Dependencies

```bash
npm i
```

### 2. Environment Setup

Copy the environment template and fill in your values:

```bash
cp env.template .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-role-key> # server-only

# Web Push (VAPID)
WEB_PUSH_PUBLIC_VAPID_KEY=<generated_public_key>
WEB_PUSH_PRIVATE_VAPID_KEY=<generated_private_key>
WEB_PUSH_CONTACT=mailto:you@example.com

# Client-side VAPID key (same as WEB_PUSH_PUBLIC_VAPID_KEY)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated_public_key>
```

**To generate VAPID keys:**

```bash
node -e "const webpush=require('web-push');console.log(webpush.generateVAPIDKeys())"
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run the SQL schema in the Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase/schema.sql
```

The schema includes:
- Locations and machines tables
- Push notification subscriptions
- Real-time updates enabled
- Row Level Security (RLS) policies
- Sample seed data

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 5. PWA Features

- Service worker auto-registers on page load
- Go to `/settings` to enable web push notifications
- Test push notifications with the "Send Test Push" button

### 6. iOS Development (Capacitor)

Build and sync to iOS:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Enable Push Notifications capability
2. Enable Background Modes: Remote notifications
3. Build and run on device

**Note**: This project uses dynamic Next.js builds (not static export) to support server-side API routes for push notifications.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── push/          # Push notification endpoints
│   │   └── machines/      # Machine management
│   ├── machines/[id]/     # Machine detail pages
│   ├── settings/          # Settings page
│   └── layout.tsx         # Root layout with providers
├── components/            # React components
│   └── Providers.tsx      # TanStack Query + Realtime
├── lib/                   # Utilities
│   ├── api.ts            # Data fetching functions
│   ├── push.ts           # Push notification helpers
│   ├── supabase.ts       # Browser client
│   └── supabase-server.ts # Server client
public/
├── manifest.json         # PWA manifest
├── sw.js                # Service worker
└── icons/               # App icons
supabase/
└── schema.sql           # Database schema
```

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **State Management**: TanStack Query
- **Real-time**: Supabase Realtime
- **PWA**: Service Worker + Web Push
- **Mobile**: Capacitor for iOS
- **Notifications**: Web Push API

## API Endpoints

- `POST /api/push/subscribe` - Subscribe to push notifications
- `POST /api/push/send-test` - Send test notification
- `POST /api/machines/start` - Start machine cycle (MVP)

## Database Schema

The app uses these main tables:
- `locations` - Laundry room locations
- `machines` - Individual washers/dryers
- `cycles` - Machine usage history
- `subscriptions` - Push notification subscriptions

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run ios          # Sync and open iOS project
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
