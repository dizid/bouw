# Roadmap - Breijer Klussen App

## Quick Fixes

### Dashboard UX
- Remove "Per medewerker" table from Overzicht tab (confusing when filtered)
- Add hours to Medewerkers tab worker list (currently only shows klussen count)

## Priority 2: Authentication & Security
**Impact:** Protect company data from unauthorized access

### Features
- Worker login (email/password or PIN)
- Role-based access (worker vs manager)
- Session timeout
- Audit logging

### Implementation
1. Enable Supabase Auth
2. Add login view
3. Protect routes with navigation guards
4. Add RLS policies to database tables

---

## Priority 3: Edit & Undo Capabilities
**Impact:** Allow correcting mistakes without admin intervention

### Features
- Edit submitted sessions (within time window)
- Soft-delete recovery (undo within 7 days)
- Change history/audit trail
- Bulk operations for managers

### Implementation
1. Add edit mode to KlussenView
2. Create "Recently Deleted" section in Dashboard
3. Add version history to sessions table
4. Create restore functionality

---

## Future Considerations

### Native Mobile (Capacitor)
- Better camera integration
- Push notifications for managers
- Home screen app with proper icon

### Reporting Enhancements
- Weekly/monthly PDF reports via email
- Time tracking integrations
- Export to accounting software

### Testing
- Unit tests for stores
- Component tests with Vitest
- E2E tests with Playwright
