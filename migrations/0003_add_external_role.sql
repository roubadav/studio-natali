-- Migration: Add 'external' role to users table
-- SQLite doesn't support ALTER CONSTRAINT, so we recreate the table

PRAGMA foreign_keys=OFF;

-- 1. Create new table with updated CHECK constraint
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'superadmin', 'external')),
    bio TEXT,
    phone TEXT,
    image TEXT,
    color TEXT DEFAULT '#ec4899',
    notification_email TEXT,
    notification_phone TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Copy all existing data
INSERT INTO users_new SELECT * FROM users;

-- 3. Drop old table
DROP TABLE users;

-- 4. Rename new table
ALTER TABLE users_new RENAME TO users;

PRAGMA foreign_keys=ON;
