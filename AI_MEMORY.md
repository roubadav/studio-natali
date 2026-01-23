# AI Memory - Studio Natali Project

## Context
This project is a reservation system for a hair salon "Studio Natali", built with Hono, Tailwind CSS, and D1 Database (SQLite). It replaces a previous static/simple site with a full dynamic application.

## Key Architecture Decisions

### 1. Locking Mechanism (Updated Jan 23, 2026)
- **Problem:** Preventing double bookings during the reservation process. Original implementation had issues where users couldn't reselect their own locked slots when navigating back in the wizard.
- **Solution v2 - Client Token System:**
  - Added `lock_token` column to `reservations` table
  - Client generates unique token (stored in sessionStorage) to identify lock ownership
  - Backend distinguishes between own locks (can reselect) and other users' locks (cannot select)
  - Visual distinction: Own locks show with primary color + lock icon, others show in red
- **Workflow:** 
  - User selects time → Creates lock with their clientToken
  - User navigates back → Sees their lock as "own-lock" status, can reselect it
  - User selects different time → Old lock deleted, new one created
  - Lock expires after 5 minutes → Auto-deleted on next availability check
  - User closes page → `beforeunload` event releases lock
- **API Changes:**
  - `POST /api/reservations/lock` accepts `clientToken`
  - `GET /api/reservations?detailed=true` returns slot status: `available`, `locked`, `own-lock`
  - `createLock()` reuses existing own lock or creates new one
- **UX:** Three slot states provide clear feedback about availability and ownership.

### 2. Working Hours & Exceptions
- **Structure:** Two tables: `working_hours_templates` (weekly default) and `working_hours_overrides` (specific dates).
- **Priority:** Overrides always take precedence over templates.
- **UI:** Admin panel separates these into two tabs, with "Exceptions" first to encourage managing holidays/doctors effectively.
- **Permissions:** Providers can only edit their own hours (unless Superadmin).

### 3. Email Flow
- **Service:** Abstracted `EmailService` class. Currently mocks sending (console.log) but has code ready for `Resend` API integration.
- **Triggers:**
    - **Created:** Email to Customer (Confirmation), Email to Worker (Approval Request).
    - **Approved/Rejected:** Email to Customer.
    - **Cancelled:** Email to Worker.
- **Management:** Token-based links (`/manage?token=...`) allow actions without logging in (for customers) or quick actions for admins.

### 4. Cancellation Rules
- **Rule:** Cancellations allowed freely > 24h before.
- **Constraint:** < 24h requires a "Reason" field.
- **Implementation:** Backend check in `/api/reservations/manage`. Frontend form dynamically shows the reason field.

### 5. Frontend Optimization
- **Images:** Uses `loading="lazy"` and `decoding="async"`.
- **Animations:** Custom `IntersectionObserver` implementation for "fade-in on scroll" effects (`.animate-on-scroll` class). All homepage sections now opt-in for scroll reveal (from top) to avoid rendering everything at once.
- **HTMX:** Used for some admin interactions, though mostly vanilla JS is used for the Reservation Wizard for fine-grained state control.

### 6. Localization & Content
- **i18n Coverage:** Public pages (homepage, reservation flow, terms, privacy, reservation action pages) were moved to `i18n.ts` to centralize text.
- **Gallery Navigation:** The gallery link in header/footer is now conditional and hidden when there are no gallery images.
- **Legal Pages:** Terms/privacy layout uses a dedicated legal card and typography styles, and contact details can be pulled from global admin settings.

### 7. Reservation UX & Availability
- **Pricing Visibility:** Prices are hidden in the reservation sidebar summary and shown only in the final confirmation summary with payment and pricing variability notes.
- **Booking Window:** The booking window is enforced in API availability and reservation creation, using the admin-configured setting. Local date formatting avoids timezone-related “missing slots” for upcoming days.

### 8. Homepage Visual Tuning
- **Hover Effects:** Removed image/icon hover zoom effects on services and gallery to reduce visual noise while keeping card-level motion where appropriate.
- **Team Photos:** Disabled the blob overlay filter for team images to avoid grainy appearance.

### 9. Maintenance Scripts (Added Jan 23, 2026)
- **cleanup-locks.sh / cleanup-locks.bat:** Scripts for cleaning persistent locked reservations
  - Usage: `./cleanup-locks.sh [--remote]` for local or production cleanup
  - Automatically deletes all locked reservations and shows statistics
  - Safe to run anytime - locks are temporary by design
- **migrate-production.sh:** Production migration script with confirmation prompts
  - Applies database schema changes to remote D1 database
  - Current migration: Adding `lock_token` column and index
- **MIGRATION_GUIDE.md:** Complete guide for database migrations and cleanup procedures

## User Roles (Seed Data)
- `admin0`: Superadmin (All access).
- `natali0`: Admin/Worker (Can manage self + view others).
- `vilma0`: Worker (Can manage self).

## Future Improvements
- **Compression:** Implement server-side image compression (e.g., using Cloudflare Images or a worker-based sharp alternative) before saving to KV/R2. Currently, full images are stored.
- **Language:** English translations are prepared in `i18n.ts` but the UI switcher is currently a placeholder.
- **Tests:** Expand `/test` route to include comprehensive E2E scenarios covering the new cancellation logic.
