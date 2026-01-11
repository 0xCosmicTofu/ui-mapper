#!/bin/bash

# Script to migrate from SQLite to PostgreSQL
# Usage: ./scripts/migrate-to-postgres.sh

set -e

echo "🔄 Migrating Prisma schema from SQLite to PostgreSQL..."

# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Update datasource provider
sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

echo "✅ Updated datasource provider to PostgreSQL"
echo ""
echo "📝 Next steps:"
echo "1. Set DATABASE_URL environment variable to your PostgreSQL connection string"
echo "2. Run: npx prisma migrate dev --name migrate_to_postgres"
echo "3. Or for production: npx prisma migrate deploy"
echo ""
echo "⚠️  Note: This will create a new migration. Your SQLite data will not be migrated automatically."
echo "   You'll need to export/import data manually if needed."
