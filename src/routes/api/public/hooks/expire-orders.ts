import { createFileRoute } from "@tanstack/react-router";

// Called by pg_cron every 15 min. Finds active orders past expires_at,
// revokes RCON + Discord role, marks as expired.
export const Route = createFileRoute("/api/public/hooks/expire-orders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { revokeOrder } = await import("@/lib/delivery.server");

        const now = new Date().toISOString();
        const { data: expired } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("status", "active")
          .lt("expires_at", now)
          .limit(50);

        const results: Array<{ id: string; rcon: boolean; discord: boolean }> = [];
        for (const o of expired ?? []) {
          const r = await revokeOrder(o.id);
          await supabaseAdmin.from("orders").update({ status: "expired" as const }).eq("id", o.id);
          results.push({ id: o.id, ...r });
        }
        return Response.json({ processed: results.length, results });
      },
    },
  },
});
