// Weekly Database Backup - JSON Only
// Exports all tables as JSON, uploads ZIP, emails link
// Runs weekly on Sunday 8 PM Amsterdam time

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { zipSync } from "npm:fflate@0.8.2";
import { createClient } from "jsr:@supabase/supabase-js@2";

const TABLES = ["job_sessions", "session_photos", "workers", "settings"];
const BACKUP_EMAIL = "marc@dizid.com";
const RETENTION_DAYS = 14;

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    // Auth check
    const secret = req.headers.get("x-backup-secret");
    if (Deno.env.get("BACKUP_SECRET") && secret !== Deno.env.get("BACKUP_SECRET")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const timestamp = new Date().toISOString().split("T")[0];
    const files: Record<string, Uint8Array> = {};
    const stats: Record<string, number> = {};

    // Export all tables as JSON
    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw new Error(`Export ${table} failed: ${error.message}`);
      files[`data/${table}.json`] = new TextEncoder().encode(JSON.stringify(data, null, 2));
      stats[table] = data?.length || 0;
    }

    // Create ZIP
    const zipData = zipSync(files);
    const filename = `bouw-backup-${timestamp}.zip`;

    await supabase.storage
      .from("backups")
      .upload(filename, zipData, { contentType: "application/zip", upsert: true });

    const { data: urlData } = await supabase.storage
      .from("backups")
      .createSignedUrl(filename, 60 * 60 * 24 * 7);

    // Cleanup old backups
    const { data: existing } = await supabase.storage.from("backups").list();
    if (existing) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
      const old = existing.filter(f => {
        const m = f.name.match(/bouw-backup-(\d{4}-\d{2}-\d{2})\.zip/);
        return m && new Date(m[1]) < cutoff;
      });
      if (old.length) await supabase.storage.from("backups").remove(old.map(f => f.name));
    }

    // Send email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Bouw Backup <onboarding@resend.dev>",
          to: [BACKUP_EMAIL],
          subject: `Bouw Weekly Backup - ${timestamp}`,
          text: `Weekly backup ready:\n\n${urlData?.signedUrl}\n\nLink valid 7 days.\n\nTables:\n${TABLES.map(t => `- ${t}: ${stats[t]} rows`).join("\n")}\n\nZIP size: ${(zipData.length / 1024).toFixed(0)}KB`,
        }),
      });
    }

    console.log(`Backup done in ${Date.now() - startTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      url: urlData?.signedUrl,
      tables: stats,
      zip_kb: (zipData.length / 1024).toFixed(0),
      duration_ms: Date.now() - startTime,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    console.error("Backup failed:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
