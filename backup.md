# Weekly Database Backup

## What It Does
- Exports all 4 database tables as JSON
- Creates a ZIP file (~50KB)
- Uploads to Supabase Storage
- Emails download link to marc@dizid.com
- Auto-deletes backups older than 14 days
- **Runs weekly on Sunday 8 PM Amsterdam time**

## Manual Test
```bash
curl -X POST https://uupvttzssafksywgfonk.supabase.co/functions/v1/daily-backup \
  -H "x-backup-secret: bouw-backup-2026"
```
Expected: Completes in ~5 seconds, returns JSON with download URL.

## Tables Backed Up
| Table | Description |
|-------|-------------|
| job_sessions | Work session records |
| session_photos | Photo metadata (links to Storage) |
| workers | Worker profiles |
| settings | App settings |

## What About Images?
Images are stored in Supabase Storage bucket `session-photos`. They don't need backup - Supabase Storage has built-in redundancy. The `session_photos` table contains all metadata to link to these images.

## Files
- `supabase/functions/daily-backup/index.ts` - Edge Function (~90 lines)

## Secrets (Supabase Dashboard)
| Secret | Value |
|--------|-------|
| RESEND_API_KEY | re_... |
| BACKUP_SECRET | bouw-backup-2026 |

## Check Cron Status
```sql
SELECT * FROM cron.job WHERE jobname = 'weekly-database-backup';
```

## Redeploy
```bash
supabase functions deploy daily-backup --no-verify-jwt --project-ref uupvttzssafksywgfonk
```
