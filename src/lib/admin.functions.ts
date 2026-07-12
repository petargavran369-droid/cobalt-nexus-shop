import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminRetryDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    order_id: z.string().uuid(),
    type: z.enum(["rust_rcon", "discord_role", "both"]),
    action: z.enum(["grant", "revoke"]).default("grant"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { deliverOrder, revokeOrder } = await import("@/lib/delivery.server");
    // Simple retry: run full pipeline in the requested direction.
    const res = data.action === "grant" ? await deliverOrder(data.order_id) : await revokeOrder(data.order_id);
    return { ok: true, ...res };
  });

export const adminExpireNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { revokeOrder } = await import("@/lib/delivery.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await revokeOrder(data.order_id);
    await supabaseAdmin.from("orders").update({ status: "expired" as const }).eq("id", data.order_id);
    return { ok: true, ...r };
  });

export const adminReactivateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { activateOrderAndDeliver } = await import("@/lib/delivery.server");
    const r = await activateOrderAndDeliver(data.order_id);
    return { ok: true, ...r };
  });
