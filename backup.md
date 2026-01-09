# Daily Database Backup

## What It Does
- Exports all 4 database tables as JSON
- Creates a ZIP file (~50KB)
- Uploads to Supabase Storage
- Emails download link to marc@dizid.com
- Auto-deletes backups older than 14 days
- **Runs daily at 8:00 PM Amsterdam time**

## Manual Test
```bash
curl -X POST https://uupvttzssafksywgfonk.supabase.co/functions/v1/daily-backup \
  -H "x-backup-secret: bouw-backup-2026"
```
Expected: Completes in ~10 seconds, returns JSON with download URL.

## Tables Backed Up
| Table | Description |
|-------|-------------|
| job_sessions | Work session records |
| session_photos | Photo metadata (links to Storage) |
| workers | Worker profiles |
| settings | App settings |

## What About Images?
Images are **already safe** in Supabase Storage bucket `session-photos`. They don't need daily re-export. The `session_photos` table contains the metadata that links to these images.

## Files
- `supabase/functions/daily-backup/index.ts` - Edge Function (90 lines)

## Secrets (Supabase Dashboard)
| Secret | Value |
|--------|-------|
| RESEND_API_KEY | re_... |
| BACKUP_SECRET | bouw-backup-2026 |

## Check Cron Status
```sql
-- See scheduled job
SELECT * FROM cron.job WHERE jobname = 'daily-database-backup';

-- See run history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-database-backup')
ORDER BY start_time DESC LIMIT 5;
```

## Redeploy
```bash
supabase functions deploy daily-backup --no-verify-jwt --project-ref uupvttzssafksywgfonk
```
