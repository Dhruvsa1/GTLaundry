# Domain Setup Guide for Laundry Tracker

This guide will help you connect your domain to your laundry tracker application for email verification and other domain-specific features.

## Prerequisites
- Your domain is registered and pointing to your hosting provider
- SSL certificate is configured (HTTPS)
- Your application is deployed and accessible via your domain

## Step 1: Environment Configuration

### Update your `.env.local` file with your production domain:

```bash
# Replace 'yourdomain.com' with your actual domain
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Example:
```bash
NEXT_PUBLIC_SITE_URL=https://laundrytracker.com
```

## Step 2: Supabase Configuration

### 2.1 Authentication Settings
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Update the following settings:

**Site URL:**
```
https://yourdomain.com
```

**Redirect URLs:**
```
https://yourdomain.com/auth/callback
https://yourdomain.com/login
https://yourdomain.com/logout
```

### 2.2 Email Templates
1. Go to **Authentication** → **Email Templates**
2. Update the **Confirm signup** template:

**Subject:** `Confirm your signup`
**Body:** 
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

3. Update the **Reset password** template:

**Subject:** `Reset your password`
**Body:**
```html
<h2>Reset your password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
```

### 2.3 CORS Settings
1. Go to **Settings** → **API**
2. Add your domain to **Additional redirect URLs**:
```
https://yourdomain.com
```

## Step 3: Web Push Notifications

### 3.1 Update VAPID Contact
Update your environment variables:
```bash
WEB_PUSH_CONTACT=mailto:admin@yourdomain.com
```

### 3.2 Service Worker Registration
Your service worker should be accessible at:
```
https://yourdomain.com/sw.js
```

## Step 4: Next.js Configuration

### 4.1 Update next.config.ts
Add domain-specific configurations:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper domain handling
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## Step 5: Testing Your Domain Integration

### 5.1 Test Email Verification
1. Sign up with a test email
2. Check that the verification email contains your domain
3. Click the verification link
4. Verify you're redirected to `https://yourdomain.com/auth/callback`

### 5.2 Test Authentication Flow
1. Try logging in
2. Try password reset
3. Verify all redirects use your domain

### 5.3 Test Push Notifications
1. Subscribe to notifications
2. Send a test notification
3. Verify notifications work with your domain

## Step 6: Security Considerations

### 6.1 HTTPS Requirements
- Ensure your domain uses HTTPS
- Update all HTTP references to HTTPS
- Configure HSTS headers if needed

### 6.2 Domain Validation
- Verify your domain in Supabase
- Check that all redirect URLs are properly configured
- Test from different browsers and devices

## Troubleshooting

### Common Issues:

1. **Email verification not working:**
   - Check Supabase Site URL configuration
   - Verify redirect URLs include your domain
   - Ensure HTTPS is properly configured

2. **CORS errors:**
   - Add your domain to Supabase CORS settings
   - Check that your domain is in the allowed origins

3. **Push notifications not working:**
   - Verify service worker is accessible
   - Check VAPID key configuration
   - Ensure HTTPS is enabled

### Debug Steps:
1. Check browser console for errors
2. Verify network requests in DevTools
3. Test with different email providers
4. Check Supabase logs for authentication errors

## Production Checklist

- [ ] Domain is accessible via HTTPS
- [ ] Environment variables updated with production domain
- [ ] Supabase Site URL configured
- [ ] Supabase redirect URLs updated
- [ ] Email templates updated
- [ ] CORS settings configured
- [ ] Push notification settings updated
- [ ] SSL certificate is valid
- [ ] All authentication flows tested
- [ ] Email verification tested
- [ ] Push notifications tested

## Support

If you encounter issues:
1. Check the Supabase dashboard logs
2. Verify your domain configuration
3. Test with a simple authentication flow
4. Check browser console for errors

