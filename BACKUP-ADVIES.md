# Backup Systeem

## Automatische Weekly Backup ✓

**Wanneer:** Elke zondag 20:00 (Amsterdam tijd)

**Wat wordt opgeslagen:**
- `job_sessions` - alle werksessies
- `session_photos` - foto metadata (verwijzingen naar Storage)
- `workers` - medewerkers
- `settings` - instellingen

**Waar te vinden:**
1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard/project/uupvttzssafksywgfonk)
2. Klik op **Storage** (linker menu)
3. Open bucket **backups**
4. Download `bouw-backup-YYYY-MM-DD.zip`

---

## Handmatige Backup (wanneer je wilt)

Open terminal en voer uit:
```bash
curl -X POST https://uupvttzssafksywgfonk.supabase.co/functions/v1/daily-backup \
  -H "x-backup-secret: bouw-backup-2026"
```

Of ga naar Supabase Dashboard → Storage → backups

---

## Herstellen van Backup

### Stap 1: Download en unzip
Download `bouw-backup-YYYY-MM-DD.zip` en pak uit. Je krijgt:
```
data/
  job_sessions.json
  session_photos.json
  workers.json
  settings.json
```

### Stap 2: Importeer in Supabase
1. Ga naar [SQL Editor](https://supabase.com/dashboard/project/uupvttzssafksywgfonk/sql)
2. Voor elke tabel die je wilt herstellen:

```sql
-- WAARSCHUWING: Dit verwijdert alle huidige data!
-- Maak eerst een backup van de huidige staat

-- Voorbeeld voor job_sessions:
TRUNCATE job_sessions CASCADE;

-- Plak dan de JSON data via Table Editor of gebruik:
INSERT INTO job_sessions SELECT * FROM json_populate_recordset(null::job_sessions, '[PLAK JSON HIER]');
```

**Makkelijker:** Gebruik de Table Editor in Supabase Dashboard om rijen handmatig te bekijken/herstellen.

---

## Foto's

Foto's staan in Supabase Storage bucket `session-photos`. Deze worden **niet** meegenomen in de backup omdat:
- Ze al veilig zijn in Supabase Storage (ingebouwde redundantie)
- De `session_photos` tabel bevat alle metadata om ze terug te vinden

---

## Opruiming

Backups ouder dan 14 dagen worden automatisch verwijderd.

---

## Technische Details

| Item | Waarde |
|------|--------|
| Edge Function | `daily-backup` |
| Cron job | `weekly-database-backup` |
| Schedule | `0 19 * * 0` (zondag 19:00 UTC = 20:00 Amsterdam) |
| Storage bucket | `backups` |
| Retentie | 14 dagen |
