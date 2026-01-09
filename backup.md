# Daily Database Backup to Email

## Goal
Export all Supabase tables daily as a ZIP file and email to emilebijster@hotmail.com at 8:00 PM (Amsterdam time).

## Architecture

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Email Service | **Resend** | 100 emails/day free, simple API, Deno-compatible |
| ZIP Library | **fflate** | Pure JS, works in Deno Edge Functions |
| Scheduling | **pg_cron + pg_net** | Native Supabase, calls Edge Function via HTTP |
| DB Access | Service Role Key | Bypasses RLS for full table export |

## Data to Export

| Table | Rows | Size |
|-------|------|------|
| job_sessions | 242 | ~100KB |
| session_photos | 341 | ~50KB (metadata only) |
| workers | 16 | ~2KB |
| settings | 1 | <1KB |

**Estimated ZIP size:** ~50-100KB

---

## Implementation Steps

### Step 1: Enable Extensions (SQL)
```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
```

### Step 2: Set Up Resend Account
1. Sign up at https://resend.com (free)
2. Get API key from dashboard
3. Add as Supabase secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
   supabase secrets set BACKUP_SECRET=random-secret-here
   ```

### Step 3: Create Edge Function

**File: `supabase/functions/daily-backup/index.ts`**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { zipSync } from "npm:fflate@0.8.2";
import { createClient } from "jsr:@supabase/supabase-js@2";

const TABLES = ["job_sessions", "session_photos", "workers", "settings"];
const BACKUP_EMAIL = "emilebijster@hotmail.com";

Deno.serve(async (req) => {
  try {
    // Verify secret header
    const secret = req.headers.get("x-backup-secret");
    if (secret !== Deno.env.get("BACKUP_SECRET")) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Export all tables
    const timestamp = new Date().toISOString().split("T")[0];
    const files: Record<string, Uint8Array> = {};

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw new Error(`Export ${table} failed: ${error.message}`);
      files[`${table}.json`] = new TextEncoder().encode(JSON.stringify(data, null, 2));
    }

    // Create ZIP
    const zipData = zipSync(files);
    const zipBase64 = btoa(String.fromCharCode(...zipData));

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bouw Backup <onboarding@resend.dev>",
        to: [BACKUP_EMAIL],
        subject: `Bouw Database Backup - ${timestamp}`,
        text: `Daily backup attached.\n\nTables: ${TABLES.join(", ")}\nGenerated: ${new Date().toISOString()}`,
        attachments: [{ filename: `bouw-backup-${timestamp}.zip`, content: zipBase64 }],
      }),
    });

    if (!response.ok) throw new Error(`Email failed: ${await response.text()}`);

    return new Response(JSON.stringify({ success: true, timestamp }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### Step 4: Deploy Edge Function
```bash
supabase functions deploy daily-backup --no-verify-jwt
```

### Step 5: Schedule Daily Cron Job (SQL)

8:00 PM Amsterdam = 19:00 UTC (winter) / 18:00 UTC (summer). Using 19:00 UTC:

```sql
select cron.schedule(
  'daily-database-backup',
  '0 19 * * *',  -- 7:00 PM UTC = 8:00 PM CET
  $$
  select net.http_post(
    url := 'https://uupvttzssafksywgfonk.supabase.co/functions/v1/daily-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-backup-secret', 'YOUR_BACKUP_SECRET_HERE'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
```

---

## Verification

1. **Test manually:**
   ```bash
   curl -X POST https://uupvttzssafksywgfonk.supabase.co/functions/v1/daily-backup \
     -H "x-backup-secret: your-secret"
   ```

2. **Check email** arrives at emilebijster@hotmail.com with ZIP

3. **Verify ZIP contents** - extract and confirm 4 JSON files

4. **Monitor cron:**
   ```sql
   select * from cron.job_run_details
   where jobid = (select jobid from cron.job where jobname = 'daily-database-backup')
   order by start_time desc limit 5;
   ```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/daily-backup/index.ts` | Create - Edge Function |
| SQL migration | Apply - Enable extensions + create cron job |

## Cost

**$0/month** - All within free tiers (Resend 100/day, Supabase Edge Functions free tier)

## Prerequisites

1. Resend account with API key
2. Supabase CLI installed (`npm install -g supabase`)
3. Project linked (`supabase link --project-ref uupvttzssafksywgfonk`)
