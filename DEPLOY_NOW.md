# Quick Deployment Guide

## Step 1: Log into Vercel

Run this command in your terminal:

```bash
vercel login
```

This will open a browser window. Sign in with your GitHub account (or create a Vercel account).

## Step 2: Deploy

Once logged in, you have two options:

### Option A: Use the Deployment Script (Recommended)

```bash
./scripts/deploy.sh
```

The script will guide you through the process.

### Option B: Deploy Manually

```bash
# Link your project (first time only)
vercel link

# Deploy to production
vercel --prod --yes
```

## Step 3: Set Up Environment Variables

**CRITICAL:** You must set environment variables in Vercel before the app will work!

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project (it will be created after first deploy)
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
VENICE_API_KEY=your_venice_api_key
AUTH_SECRET=your_generated_secret (run: openssl rand -base64 32)
DATABASE_URL=your_postgresql_connection_string
NEXTAUTH_URL=https://your-app.vercel.app (auto-set, but verify)
```

**Optional:**
```
VENICE_MODEL_ID=claude-opus-45
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Step 4: Set Up Database

1. **In Vercel Dashboard:**
   - Go to **Storage** → **Create Database** → **Postgres**
   - Copy the `DATABASE_URL` connection string
   - Add it to Environment Variables (see Step 3)

2. **Run Migrations:**
   ```bash
   # Pull environment variables locally
   vercel env pull .env.local
   
   # Run migrations
   npx prisma migrate deploy
   ```

   Or, Vercel will automatically run migrations on deploy if you have `DATABASE_URL` set.

## Step 5: Redeploy

After setting environment variables, redeploy:

```bash
vercel --prod --yes
```

## That's It! 🎉

Your app should now be live at `https://your-app.vercel.app`

---

## Troubleshooting

### "No existing credentials found"
- Run `vercel login` first

### "Command requires confirmation"
- Use `--yes` flag: `vercel --prod --yes`

### Database connection errors
- Make sure `DATABASE_URL` is set correctly
- Verify PostgreSQL database is running
- Check that migrations have run: `npx prisma migrate status`

### Build errors
- Check Vercel build logs in dashboard
- Ensure all environment variables are set
- Verify `package.json` scripts are correct

---

## Need Help?

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
