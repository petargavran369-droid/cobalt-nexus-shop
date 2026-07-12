// Server-only delivery pipeline: Rust WebRCON + Discord role management.
// Never import this from client code — filename `.server.ts` blocks it from
// the client bundle.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type DeliveryAction = "grant" | "revoke";
type DeliveryType = "rust_rcon" | "discord_role";

interface DeliveryContext {
  order_id: string;
  package_slug: string;
  steam_id: string | null;
  discord_id: string | null;
}

const RCON_COMMANDS: Record<string, { add: string; remove: string; roleEnv: string } | undefined> = {
  "vip": {
    add: "cobalt.vipranks.vip.add",
    remove: "cobalt.vipranks.vip.remove",
    roleEnv: "DISCORD_ROLE_VIP_ID",
  },
  "vip-plus": {
    add: "cobalt.vipranks.vipplus.add",
    remove: "cobalt.vipranks.vipplus.remove",
    roleEnv: "DISCORD_ROLE_VIPPLUS_ID",
  },
  "queue-priority": {
    add: "cobalt.vipranks.queue.add",
    remove: "cobalt.vipranks.queue.remove",
    roleEnv: "DISCORD_ROLE_QUEUE_PRIORITY_ID",
  },
};

const SUPPORTER_ROLE_ENV = "DISCORD_ROLE_SUPPORTER_ID";

async function logDelivery(row: {
  order_id: string;
  type: DeliveryType;
  action: DeliveryAction;
  status: "success" | "failed";
  request: unknown;
  response: unknown;
  error?: string | null;
}) {
  await supabaseAdmin.from("deliveries").insert({
    order_id: row.order_id,
    type: row.type,
    action: row.action,
    status: row.status,
    request_payload: row.request as any,
    response_payload: row.response as any,
    error_message: row.error ?? null,
  } as any);
}

// ---------- Rust WebRCON via WebSocket ----------
export async function sendRconCommand(command: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const host = process.env.RUST_RCON_HOST;
  const port = process.env.RUST_RCON_PORT;
  const password = process.env.RUST_RCON_PASSWORD;
  if (!host || !port || !password) return { ok: false, error: "RCON not configured" };

  const url = `ws://${host}:${port}/${password}`;

  return new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ws?.close(); } catch {}
      resolve({ ok: false, error: "RCON timeout" });
    }, 8000);

    try {
      ws = new WebSocket(url);
    } catch (e: any) {
      clearTimeout(timeout);
      return resolve({ ok: false, error: e?.message || "RCON connect failed" });
    }

    ws.onopen = () => {
      const identifier = Math.floor(Math.random() * 100000) + 1;
      ws.send(JSON.stringify({ Identifier: identifier, Message: command, Name: "CobaltShop" }));
      // Give the server ~1.2s to respond, then consider success.
      setTimeout(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        resolve({ ok: true, message: "Command sent" });
      }, 1200);
    };
    ws.onmessage = (ev) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      let msg = "";
      try { msg = JSON.parse(String(ev.data))?.Message ?? String(ev.data); } catch { msg = String(ev.data); }
      resolve({ ok: true, message: msg });
    };
    ws.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ok: false, error: "RCON websocket error" });
    };
  });
}

// ---------- Discord role via Bot API ----------
async function discordRoleCall(
  action: DeliveryAction,
  userId: string,
  roleId: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!botToken || !guildId) return { ok: false, status: 0, body: "Discord bot not configured" };
  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`;
  const res = await fetch(url, {
    method: action === "grant" ? "PUT" : "DELETE",
    headers: {
      authorization: `Bot ${botToken}`,
      "content-type": "application/json",
    },
  });
  const body = await res.text();
  // 204 No Content on success; 404 also acceptable for revoke (already removed).
  const ok = res.ok || (action === "revoke" && res.status === 404);
  return { ok, status: res.status, body };
}

// ---------- Public entry points ----------
export async function deliverOrder(orderId: string): Promise<{ rcon: boolean; discord: boolean }> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*, packages(slug)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { rcon: false, discord: false };

  const slug = (order as any).packages?.slug as string;
  const ctx: DeliveryContext = {
    order_id: order.id,
    package_slug: slug,
    steam_id: order.steam_id,
    discord_id: order.discord_id,
  };
  return runDelivery(ctx, "grant");
}

export async function revokeOrder(orderId: string): Promise<{ rcon: boolean; discord: boolean }> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*, packages(slug)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { rcon: false, discord: false };

  const slug = (order as any).packages?.slug as string;
  const ctx: DeliveryContext = {
    order_id: order.id,
    package_slug: slug,
    steam_id: order.steam_id,
    discord_id: order.discord_id,
  };
  return runDelivery(ctx, "revoke");
}

async function runDelivery(ctx: DeliveryContext, action: DeliveryAction) {
  const map = RCON_COMMANDS[ctx.package_slug];
  let rconOk = true; // support has no RCON step
  let discordOk = true;

  // ---- RCON step (skip for support package) ----
  if (map && ctx.steam_id) {
    const cmd = action === "grant"
      ? `${map.add} ${ctx.steam_id} 30`
      : `${map.remove} ${ctx.steam_id}`;
    const res = await sendRconCommand(cmd);
    rconOk = res.ok;
    await logDelivery({
      order_id: ctx.order_id,
      type: "rust_rcon",
      action,
      status: res.ok ? "success" : "failed",
      request: { command: cmd },
      response: { message: res.message, error: res.error },
      error: res.error ?? null,
    });
  } else if (map && !ctx.steam_id) {
    rconOk = false;
    await logDelivery({
      order_id: ctx.order_id, type: "rust_rcon", action, status: "failed",
      request: { slug: ctx.package_slug }, response: null, error: "No steam_id linked",
    });
  }

  // ---- Discord role step ----
  const roleEnv = map ? map.roleEnv : (ctx.package_slug === "support" ? SUPPORTER_ROLE_ENV : null);
  const roleId = roleEnv ? process.env[roleEnv] : null;
  if (roleId && ctx.discord_id) {
    const res = await discordRoleCall(action, ctx.discord_id, roleId);
    discordOk = res.ok;
    await logDelivery({
      order_id: ctx.order_id,
      type: "discord_role",
      action,
      status: res.ok ? "success" : "failed",
      request: { role_id: roleId, user_id: ctx.discord_id },
      response: { status: res.status, body: res.body.slice(0, 500) },
      error: res.ok ? null : `HTTP ${res.status}: ${res.body.slice(0, 200)}`,
    });
  } else if (roleId && !ctx.discord_id) {
    discordOk = false;
    await logDelivery({
      order_id: ctx.order_id, type: "discord_role", action, status: "failed",
      request: { role_id: roleId }, response: null, error: "No discord_id linked",
    });
  }

  return { rcon: rconOk, discord: discordOk };
}

export async function activateOrderAndDeliver(orderId: string) {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await supabaseAdmin.from("orders").update({
    status: "active",
    paid_at: now.toISOString(),
    expires_at: expires.toISOString(),
  }).eq("id", orderId);
  return deliverOrder(orderId);
}
