#!/bin/bash
# Production migration script
# This script applies database migrations to production

set -e

echo "🚀 Production Migration Script"
echo "=============================="
echo ""

read -p "This will apply migrations to PRODUCTION database. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted."
  exit 0
fi

echo ""
echo "Step 1: Adding lock_token column..."
npx wrangler d1 execute studio-natali-db --remote --command "ALTER TABLE reservations ADD COLUMN lock_token TEXT;"

echo ""
echo "Step 2: Creating index on lock_token..."
npx wrangler d1 execute studio-natali-db --remote --command "CREATE INDEX IF NOT EXISTS idx_reservations_lock_token ON reservations(lock_token);"

echo ""
echo "Step 3: Cleaning up any existing locked reservations..."
npx wrangler d1 execute studio-natali-db --remote --command "DELETE FROM reservations WHERE status = 'locked';"

echo ""
echo "✅ Production migration completed successfully!"
echo ""
echo "Database stats:"
npx wrangler d1 execute studio-natali-db --remote --command "SELECT status, COUNT(*) as count FROM reservations GROUP BY status;"

echo ""
echo "🎉 Done! You can now deploy the application."
