# Database Migration & Cleanup Scripts

## Migration Scripts

### Local Migration
Already applied automatically when you run `npm run dev`.

### Production Migration
To apply migrations to production database:

```bash
./migrate-production.sh
```

Or manually:
```bash
npx wrangler d1 execute studio-natali-db --remote --command "ALTER TABLE reservations ADD COLUMN lock_token TEXT;"
npx wrangler d1 execute studio-natali-db --remote --command "CREATE INDEX IF NOT EXISTS idx_reservations_lock_token ON reservations(lock_token);"
```

## Cleanup Scripts

### Clean Locked Reservations

**Local (development):**
```bash
./cleanup-locks.sh
# or on Windows:
cleanup-locks.bat
```

**Production:**
```bash
./cleanup-locks.sh --remote
# or on Windows:
cleanup-locks.bat --remote
```

This will:
1. Delete all reservations with `status = 'locked'`
2. Clean up expired locks
3. Show reservation statistics

### When to Use Cleanup

- After testing lock functionality
- If you see persistent locked slots due to bugs
- Regular maintenance (though automatic cleanup happens on every availability check)

## What Changed

### Lock Token System
- Added `lock_token` column to `reservations` table
- Client generates unique token stored in sessionStorage
- Locks are now tied to specific clients
- Users can reselect their own locked slots when navigating back

### Lock Behavior
- **Own locks**: Display with primary color and lock icon, can be reselected
- **Other locks**: Display in red, cannot be selected
- **Auto-cleanup**: Expired locks (>5 minutes) are automatically deleted
- **Page close**: Locks are released when user closes browser

## Deployment

1. **Run local migration** (already done if dev server runs)
2. **Test locally**: http://localhost:8787
3. **Run production migration**: `./migrate-production.sh`
4. **Deploy**: `npm run deploy` or use deploy scripts
5. **Clean up if needed**: `./cleanup-locks.sh --remote`

## Troubleshooting

### Persistent locked slots
Run cleanup script:
```bash
./cleanup-locks.sh --remote
```

### Migration already applied error
If you see "duplicate column name", the migration was already applied. You can skip it or drop and recreate the column (not recommended for production).

### Check current lock status
```bash
# Local
npx wrangler d1 execute studio-natali-db --local --command "SELECT * FROM reservations WHERE status = 'locked';"

# Production
npx wrangler d1 execute studio-natali-db --remote --command "SELECT * FROM reservations WHERE status = 'locked';"
```
