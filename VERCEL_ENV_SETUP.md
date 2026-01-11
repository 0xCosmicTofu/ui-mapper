# Vercel Environment Variables Setup

## Quick Import Instructions

1. **Set up PostgreSQL Database FIRST** (Required!)
   - Go to Vercel Dashboard → Your Project → Storage
   - Click "Create Database" → Select "Postgres"
   - Copy the `DATABASE_URL` connection string

2. **Import Environment Variables**
   - In Vercel deployment page, expand "Environment Variables"
   - Click "Import .env" button
   - Select the `.env.vercel` file from this project
   - **IMPORTANT**: After importing, update `DATABASE_URL` with the PostgreSQL connection string from step 1
   - **IMPORTANT**: Update `NEXTAUTH_URL` to your actual Vercel URL (e.g., `https://ui-mapper-xyz.vercel.app`)

3. **Deploy!**

## Environment Variables Included

✅ **VENICE_API_KEY** - Your Venice API key (already configured)
✅ **VENICE_MODEL_ID** - Model ID (claude-opus-45)
✅ **AUTH_SECRET** - Secure authentication secret (newly generated)
✅ **GOOGLE_CLIENT_ID** - Google OAuth client ID (already configured)
✅ **GOOGLE_CLIENT_SECRET** - Google OAuth secret (already configured)
⚠️ **DATABASE_URL** - **MUST BE UPDATED** with PostgreSQL connection string
⚠️ **NEXTAUTH_URL** - **MUST BE UPDATED** with your actual Vercel URL

## After First Deployment

1. **Update Google OAuth Redirect URI**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services → Credentials
   - Edit your OAuth 2.0 Client
   - Add authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
   - Save changes

2. **Verify Database Migrations**
   - Vercel should automatically run `prisma migrate deploy` on first deploy
   - Check deployment logs to confirm migrations ran successfully

3. **Test Your Deployment**
   - Visit your Vercel URL
   - Test sign-up and sign-in
   - Test URL analysis functionality

## Troubleshooting

### "Database connection failed"
- Make sure `DATABASE_URL` is set to a PostgreSQL connection string (not SQLite)
- Verify the database is running in Vercel Storage

### "Auth error with missing secret"
- Make sure `AUTH_SECRET` is set in environment variables
- Redeploy after adding it

### "Invalid NEXTAUTH_URL"
- Update `NEXTAUTH_URL` to match your actual Vercel deployment URL
- Format: `https://your-app.vercel.app` (no trailing slash)
