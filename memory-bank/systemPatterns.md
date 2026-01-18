# System Patterns

## Architecture
- Next.js App Router app.
- API routes under `app/api`.
- Authentication via NextAuth configuration in `auth.ts` / `auth.config.ts`.
- Prisma for database access.

## Key Flows
- Auth flow: NextAuth provider -> callback -> session -> protected routes.
- Analysis pipeline: scrape -> detect components -> model content -> map -> export.

## Design Patterns
- Services for AI and scraping under `lib/services`.
- Shared utilities in `lib/utils`.
