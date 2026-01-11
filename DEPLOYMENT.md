# Deployment Guide

This guide covers deploying the Webflow UI Mapper to production.

## Prerequisites

- GitHub repository (already set up at `https://github.com/0xCosmicTofu/ui-mapper.git`)
- All environment variables configured
- Database migration completed

## ⚡ Quick Start (Vercel - 5 minutes)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project" → Import `0xCosmicTofu/ui-mapper`
3. Add environment variables (see below)
4. Add Vercel Postgres database (or use external PostgreSQL)
5. Click "Deploy"
6. Done! Your app is live 🎉

**Environment Variables Needed:**
```
VENICE_API_KEY=your_key
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-app.vercel.app (auto-set by Vercel)
DATABASE_URL=postgresql://... (from Vercel Postgres or external)
```

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

Vercel is made by the creators of Next.js and provides the simplest deployment experience.

#### Steps:

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account

2. **Import Project**
   - Click "Add New Project"
   - Import from GitHub: `0xCosmicTofu/ui-mapper`
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables**
   In Vercel dashboard → Project Settings → Environment Variables, add:
   ```
   VENICE_API_KEY=your_venice_api_key
   VENICE_MODEL_ID=claude-opus-45
   AUTH_SECRET=your_auth_secret (generate with: openssl rand -base64 32)
   NEXTAUTH_URL=https://your-app.vercel.app (auto-set by Vercel, or use custom domain)
   DATABASE_URL=your_postgresql_connection_string
   GOOGLE_CLIENT_ID=your_google_client_id (optional)
   GOOGLE_CLIENT_SECRET=your_google_client_secret (optional)
   ```

4. **Set up Database (PostgreSQL) - CRITICAL STEP!**
   
   **⚠️ IMPORTANT:** You must switch from SQLite to PostgreSQL before deploying!
   
   **Option A: Vercel Postgres (Easiest)**
   - In Vercel dashboard → Storage → Create Database → Postgres
   - Copy the `DATABASE_URL` connection string
   
   **Option B: External PostgreSQL**
   - Use Supabase, Neon, Railway, or any PostgreSQL provider
   - Get your connection string (format: `postgresql://user:pass@host:5432/dbname`)
   
   **Update Prisma Schema:**
   - Edit `prisma/schema.prisma`
   - Change `provider = "sqlite"` to `provider = "postgresql"`
   - Commit and push: `git add prisma/schema.prisma && git commit -m "Switch to PostgreSQL" && git push`

5. **Configure Environment Variables**
   In Vercel dashboard → Project Settings → Environment Variables, add:
   ```
   VENICE_API_KEY=your_venice_api_key
   VENICE_MODEL_ID=claude-opus-45 (optional)
   AUTH_SECRET=your_auth_secret (generate: openssl rand -base64 32)
   NEXTAUTH_URL=https://your-app.vercel.app (Vercel auto-sets this, or use custom domain)
   DATABASE_URL=postgresql://... (from step 4)
   GOOGLE_CLIENT_ID=your_google_client_id (optional)
   GOOGLE_CLIENT_SECRET=your_google_client_secret (optional)
   ```

6. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Your app will be live at `https://your-app.vercel.app`

7. **Update Google OAuth (if using)**
   - In Google Cloud Console → Credentials
   - Edit your OAuth 2.0 Client
   - Add authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
   - Save changes

8. **Verify Deployment**
   - Check Vercel build logs for any errors
   - Visit your deployed URL
   - Test sign-up and analysis functionality

#### Vercel Advantages:
- ✅ Zero-config Next.js deployment
- ✅ Automatic HTTPS
- ✅ Built-in PostgreSQL option
- ✅ Automatic deployments on git push
- ✅ Free tier available
- ✅ Edge functions support

---

### Option 2: Railway

Railway provides easy database setup and deployment.

#### Steps:

1. **Sign up at [railway.app](https://railway.app)**
2. **Create New Project** → "Deploy from GitHub repo"
3. **Add PostgreSQL Service** → Railway will provide `DATABASE_URL`
4. **Configure Environment Variables** in Railway dashboard
5. **Deploy** → Railway auto-detects Next.js and deploys

---

### Option 3: Render

#### Steps:

1. **Sign up at [render.com](https://render.com)**
2. **Create New Web Service** → Connect GitHub repo
3. **Build Command**: `npm install && npx prisma generate && npm run build`
4. **Start Command**: `npm start`
5. **Add PostgreSQL Database** → Get `DATABASE_URL`
6. **Configure Environment Variables**
7. **Deploy**

---

### Option 4: Self-Hosted (VPS/Docker)

For more control, you can deploy to a VPS using Docker.

#### Docker Setup:

1. **Create `Dockerfile`** (see below)
2. **Create `docker-compose.yml`** for app + PostgreSQL
3. **Deploy to VPS** (DigitalOcean, AWS EC2, etc.)

---

## Database Migration (Important!)

**SQLite (dev.db) will NOT work in production.** You need PostgreSQL.

### Steps to Migrate:

1. **Set up PostgreSQL database** (Vercel Postgres, Supabase, Neon, Railway, etc.)

2. **Update `prisma/schema.prisma`**:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. **Update `DATABASE_URL`** in production environment:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
   ```

4. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

5. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

---

## Environment Variables Checklist

Ensure all these are set in your production environment:

- ✅ `VENICE_API_KEY` - Required
- ✅ `VENICE_MODEL_ID` - Optional (defaults to claude-opus-45)
- ✅ `AUTH_SECRET` - Required (generate with `openssl rand -base64 32`)
- ✅ `NEXTAUTH_URL` - Required (your production URL)
- ✅ `DATABASE_URL` - Required (PostgreSQL connection string)
- ⚠️ `GOOGLE_CLIENT_ID` - Optional (for Google OAuth)
- ⚠️ `GOOGLE_CLIENT_SECRET` - Optional (for Google OAuth)

---

## Post-Deployment Checklist

- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Update Google OAuth redirect URIs (if using Google sign-in)
- [ ] Verify database migrations ran successfully
- [ ] Test user sign-up and sign-in
- [ ] Test website analysis functionality
- [ ] Verify exports are working
- [ ] Check Playwright browser installation (may need build config)

---

## Playwright in Production

Playwright requires Chromium to be installed. For Vercel/Railway, you may need:

1. **Add to `package.json`**:
   ```json
   "scripts": {
     "postinstall": "npx playwright install chromium"
   }
   ```

2. **Or use Playwright's bundled browser** (already included in node_modules)

---

## Custom Domain Setup

1. **Add domain in Vercel/Railway/Render dashboard**
2. **Update DNS records** as instructed
3. **Update `NEXTAUTH_URL`** to your custom domain
4. **Update Google OAuth redirect URIs** (if using)

---

## Monitoring & Maintenance

- Monitor API usage (Venice API credits)
- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor database performance
- Set up uptime monitoring

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment
