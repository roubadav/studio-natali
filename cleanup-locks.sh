#!/bin/bash
# Cleanup script for locked reservations in production
# Usage: ./cleanup-locks.sh [--remote]

set -e

REMOTE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --remote)
      REMOTE="--remote"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--remote]"
      exit 1
      ;;
  esac
done

if [ -z "$REMOTE" ]; then
  echo "🧹 Cleaning locked reservations from LOCAL database..."
  echo "⚠️  Use --remote flag to clean production database"
else
  echo "🧹 Cleaning locked reservations from REMOTE (production) database..."
  read -p "Are you sure you want to clean production locks? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 0
  fi
fi

# Delete all locked reservations
echo "Deleting all locked reservations..."
npx wrangler d1 execute studio-natali-db $REMOTE --command "DELETE FROM reservations WHERE status = 'locked';"

# Clean up expired locks (just in case)
echo "Cleaning up expired locks..."
npx wrangler d1 execute studio-natali-db $REMOTE --command "DELETE FROM reservations WHERE status = 'locked' AND lock_expires_at < datetime('now');"

# Show stats
echo ""
echo "✅ Cleanup completed!"
echo "Getting reservation stats..."
npx wrangler d1 execute studio-natali-db $REMOTE --command "SELECT status, COUNT(*) as count FROM reservations GROUP BY status;"

echo ""
echo "Done! 🎉"
