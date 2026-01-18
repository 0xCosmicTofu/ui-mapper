# Tech Context

## Stack
- Next.js (App Router)
- TypeScript
- NextAuth
- Prisma (SQLite in dev; PostgreSQL in prod)
- Playwright

## Dev Setup
- Node.js 18+
- `npm install`
- `npx prisma migrate dev && npx prisma generate`
- `npm run dev`

## Key Configuration
- `.env` with `AUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL`
- Optional Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
