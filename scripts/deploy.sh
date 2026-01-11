#!/bin/bash

# Deployment script for Vercel
# This script will guide you through the deployment process

set -e

echo "🚀 Webflow UI Mapper - Deployment Script"
echo "=========================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "   Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "⚠️  You're not logged into Vercel."
    echo ""
    echo "📝 Please run the following command to log in:"
    echo "   vercel login"
    echo ""
    echo "   This will open a browser for authentication."
    echo "   After logging in, run this script again."
    exit 1
fi

echo "✅ Logged into Vercel as: $(vercel whoami)"
echo ""

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
    echo "📦 Linking project to Vercel..."
    vercel link
    echo ""
fi

echo "🔍 Checking environment variables..."
echo ""
echo "⚠️  IMPORTANT: Before deploying, make sure you have set these environment variables in Vercel:"
echo "   - VENICE_API_KEY"
echo "   - AUTH_SECRET (generate with: openssl rand -base64 32)"
echo "   - DATABASE_URL (PostgreSQL connection string)"
echo "   - NEXTAUTH_URL (will be auto-set by Vercel)"
echo ""
echo "   Optional:"
echo "   - VENICE_MODEL_ID (defaults to claude-opus-45)"
echo "   - GOOGLE_CLIENT_ID"
echo "   - GOOGLE_CLIENT_SECRET"
echo ""
read -p "Have you set up your environment variables in Vercel? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📝 Please set up your environment variables first:"
    echo "   1. Go to https://vercel.com/dashboard"
    echo "   2. Select your project"
    echo "   3. Go to Settings → Environment Variables"
    echo "   4. Add all required variables"
    echo ""
    echo "   Then run this script again."
    exit 1
fi

echo ""
echo "🚀 Deploying to Vercel..."
echo ""

# Deploy to production
vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Set up PostgreSQL database (if not already done)"
echo "   2. Run database migrations: vercel env pull && npx prisma migrate deploy"
echo "   3. Test your deployed application"
echo ""
