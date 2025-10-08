# Setting Up Base64 Logo in Vercel

## Step 1: Get the Base64 String
Your base64 logo is in `public/icons/gtllogo.txt`. You need to add the `data:image/png;base64,` prefix to it.

## Step 2: Add to Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your GTLaundry project
3. Go to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Name**: `NEXT_PUBLIC_LOGO_BASE64`
   - **Value**: `data:image/png;base64,` + (contents of gtllogo.txt)
   - **Environment**: Production (and Preview if desired)

## Step 3: Deploy
After adding the environment variable, trigger a new deployment:
- Go to **Deployments** tab
- Click **Redeploy** on the latest deployment

## Alternative: Use a Smaller Logo
If the base64 string is too large for Vercel's environment variable limits:
1. Optimize your logo to be smaller (under 500KB)
2. Convert to WebP format for better compression
3. Or use a CDN service like Cloudinary

## Current Setup
- ✅ Layout.tsx configured to use `NEXT_PUBLIC_LOGO_BASE64`
- ✅ Fallback to `icon-192.png` if base64 not available
- ✅ Large files removed from Git repository
- ✅ .gitignore updated to prevent large files

## File Structure
```
public/icons/
├── gtllogo.txt (base64 - NOT in Git)
├── icon-192.png (fallback)
├── icon-512.png (fallback)
└── icon-*.svg (fallback)
```
