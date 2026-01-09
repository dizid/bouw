// Daily Database Backup Edge Function
// Exports all tables as JSON, creates ZIP, emails to backup recipient

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { zipSync } from "npm:fflate@0.8.2";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Tables to backup
const TABLES = ["job_sessions", "session_photos", "workers", "settings"];
const BACKUP_EMAIL = "emilebijster@hotmail.com";

Deno.serve(async (req) => {
  try {
    // Verify secret header to prevent unauthorized access
    const secret = req.headers.get("x-backup-secret");
    const expectedSecret = Deno.env.get("BACKUP_SECRET");

    if (expectedSecret && secret !== expectedSecret) {
      console.error("Unauthorized backup attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("Starting daily backup...");

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Export all tables as JSON
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const files: Record<string, Uint8Array> = {};
    const stats: Record<string, number> = {};

    for (const table of TABLES) {
      console.log(`Exporting table: ${table}`);

      const { data, error } = await supabase
        .from(table)
        .select("*");

      if (error) {
        throw new Error(`Failed to export ${table}: ${error.message}`);
      }

      const jsonContent = JSON.stringify(data, null, 2);
      files[`${table}.json`] = new TextEncoder().encode(jsonContent);
      stats[table] = data?.length || 0;

      console.log(`Exported ${table}: ${stats[table]} rows`);
    }

    // Create ZIP file
    console.log("Creating ZIP file...");
    const zipData = zipSync(files);

    // Convert to base64 for email attachment
    const zipBase64 = btoa(String.fromCharCode(...zipData));
    const filename = `bouw-backup-${timestamp}.zip`;

    console.log(`ZIP created: ${filename} (${zipData.length} bytes)`);

    // Send email via Resend
    console.log("Sending email via Resend...");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bouw Backup <onboarding@resend.dev>",
        to: [BACKUP_EMAIL],
        subject: `Bouw Database Backup - ${timestamp}`,
        text: [
          "Daily database backup attached.",
          "",
          "Tables included:",
          ...TABLES.map(t => `- ${t}: ${stats[t]} rows`),
          "",
          `Generated: ${new Date().toISOString()}`,
          `ZIP size: ${zipData.length} bytes`,
        ].join("\n"),
        attachments: [
          {
            filename: filename,
            content: zipBase64,
          }
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Backup email sent successfully:", emailResult.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Backup sent successfully",
        email_id: emailResult.id,
        timestamp: new Date().toISOString(),
        tables: stats,
        zip_size_bytes: zipData.length,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Backup failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
