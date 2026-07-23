// Server-only delivery pipeline: Rust WebRCON + Discord role management.
// Never import this from client code — filename `.server.ts` blocks it from
// the client bundle.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type DeliveryAction = "grant" | "revoke";
type DeliveryType = "rust_rcon" | "discord_role";

interface DeliveryContext {
  order_id: string;
  package_slug: string;
  duration_days: number;
  steam_id: string | null;
  discord_id: string | null;
}

interface LoadedOrder {
  status: string | null;
  activated_at: string | null;
  expires_at: string | null;
  ctx: DeliveryContext;
}

interface RconResult {
  ok: boolean;
  message?: string;
  error?: string;
}

interface DiscordResult {
  ok: boolean;
  status: number;
  body: string;
}

const RCON_COMMANDS: Record<
  string,
  { add: string; remove: string; roleEnv: string } | undefined
> = {
  vip: {
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
const DEFAULT_DURATION_DAYS = 30;
const MAX_DURATION_DAYS = 3650;

function cleanId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeDurationDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DURATION_DAYS;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_DURATION_DAYS);
}

async function loadOrder(orderId: string): Promise<LoadedOrder | null> {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*, packages(slug, duration_days)")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("[delivery] order lookup failed", {
      orderId,
      error: error.message,
    });
    throw new Error(`Order lookup failed: ${error.message}`);
  }

  if (!order) {
    console.error("[delivery] order not found", { orderId });
    return null;
  }

  const packageData = (order as any).packages;
  const slug =
    typeof packageData?.slug === "string" ? packageData.slug.trim() : "";

  return {
    status: typeof (order as any).status === "string" ? (order as any).status : null,
    activated_at:
      typeof (order as any).activated_at === "string"
        ? (order as any).activated_at
        : null,
    expires_at:
      typeof (order as any).expires_at === "string"
        ? (order as any).expires_at
        : null,
    ctx: {
      order_id: (order as any).id,
      package_slug: slug,
      duration_days: normalizeDurationDays(packageData?.duration_days),
      steam_id: cleanId((order as any).steam_id),
      discord_id: cleanId((order as any).discord_id),
    },
  };
}

async function wasStepSuccessful(
  orderId: string,
  type: DeliveryType,
  action: DeliveryAction,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("deliveries")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", type)
    .eq("action", action)
    .eq("status", "success")
    .limit(1)
    .maybeSingle();

  if (error) {
    // Do not block delivery if the idempotency lookup itself fails.
    console.error("[delivery] success lookup failed", {
      orderId,
      type,
      action,
      error: error.message,
    });
    return false;
  }

  return Boolean(data);
}

async function logDelivery(row: {
  order_id: string;
  type: DeliveryType;
  action: DeliveryAction;
  status: "success" | "failed";
  target?: string | null;
  command?: string | null;
  request: unknown;
  response: unknown;
  error?: string | null;
}): Promise<boolean> {
  const { error } = await supabaseAdmin.from("deliveries").insert({
    order_id: row.order_id,
    type: row.type,
    action: row.action,
    target: row.target ?? null,
    command: row.command ?? null,
    status: row.status,
    request_payload: row.request as any,
    response_payload: row.response as any,
    error_message: row.error ?? null,
  } as any);

  if (error) {
    // Keep the actual RCON/Discord pipeline running, but make the database
    // mismatch visible in Vercel logs.
    console.error("[delivery.log] insert failed", {
      orderId: row.order_id,
      type: row.type,
      action: row.action,
      status: row.status,
      error: error.message,
    });
    return false;
  }

  return true;
}

// ---------- Rust WebRCON via WebSocket ----------
export async function sendRconCommand(command: string): Promise<RconResult> {
  const host = process.env.RUST_RCON_HOST?.trim();
  const port = process.env.RUST_RCON_PORT?.trim();
  const password = process.env.RUST_RCON_PASSWORD;

  if (!host || !port || !password) {
    return { ok: false, error: "RCON not configured" };
  }

  if (!/^\d{1,5}$/.test(port)) {
    return { ok: false, error: "Invalid RUST_RCON_PORT" };
  }

  const url = `ws://${host}:${port}/${encodeURIComponent(password)}`;

  return new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket | undefined;

    const finish = (result: RconResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        ws?.close();
      } catch {
        // ignored
      }
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({ ok: false, error: "RCON timeout" });
    }, 8000);

    try {
      ws = new WebSocket(url);
    } catch (error: any) {
      finish({
        ok: false,
        error: error?.message || "RCON connect failed",
      });
      return;
    }

    ws.onopen = () => {
      const identifier = Math.floor(Math.random() * 100000) + 1;

      try {
        ws?.send(
          JSON.stringify({
            Identifier: identifier,
            Message: command,
            Name: "CobaltShop",
          }),
        );
      } catch (error: any) {
        finish({
          ok: false,
          error: error?.message || "RCON send failed",
        });
        return;
      }

      // Some Rust WebRCON setups do not return command output. An open socket
      // plus a successful send is considered accepted after a short grace time.
      setTimeout(() => {
        finish({ ok: true, message: "Command sent" });
      }, 1500);
    };

    ws.onmessage = (event) => {
      let message = "";

      try {
        const parsed = JSON.parse(String(event.data));
        message = parsed?.Message ?? String(event.data);
      } catch {
        message = String(event.data);
      }

      const lower = message.toLowerCase();
      const commandFailed =
        lower.includes("unknown command") ||
        lower.includes("command not found") ||
        lower.includes("invalid command") ||
        lower.startsWith("usage:");

      if (commandFailed) {
        finish({ ok: false, error: message });
        return;
      }

      finish({ ok: true, message });
    };

    ws.onerror = () => {
      finish({ ok: false, error: "RCON websocket error" });
    };

    ws.onclose = () => {
      if (!settled) {
        finish({ ok: false, error: "RCON connection closed before confirmation" });
      }
    };
  });
}

// ---------- Discord role via Bot API ----------
async function discordRoleCall(
  action: DeliveryAction,
  userId: string,
  roleId: string,
): Promise<DiscordResult> {
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  if (!botToken || !guildId) {
    return {
      ok: false,
      status: 0,
      body: "Discord bot not configured",
    };
  }

  const url =
    `https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}` +
    `/members/${encodeURIComponent(userId)}` +
    `/roles/${encodeURIComponent(roleId)}`;

  try {
    const response = await fetch(url, {
      method: action === "grant" ? "PUT" : "DELETE",
      headers: {
        authorization: `Bot ${botToken}`,
        "content-type": "application/json",
      },
    });

    const body = await response.text();
    // Discord returns 204 No Content on success. A revoke returning 404 means
    // the role/member is already absent and is therefore idempotently complete.
    const ok =
      response.ok || (action === "revoke" && response.status === 404);

    return { ok, status: response.status, body };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      body: error?.message || "Discord request failed",
    };
  }
}

// ---------- Public entry points ----------
export async function deliverOrder(
  orderId: string,
  force = false,
): Promise<{ rcon: boolean; discord: boolean }> {
  const loaded = await loadOrder(orderId);
  if (!loaded) return { rcon: false, discord: false };
  return runDelivery(loaded.ctx, "grant", force);
}

export async function revokeOrder(
  orderId: string,
  force = false,
): Promise<{ rcon: boolean; discord: boolean }> {
  const loaded = await loadOrder(orderId);
  if (!loaded) return { rcon: false, discord: false };
  return runDelivery(loaded.ctx, "revoke", force);
}

async function runDelivery(
  ctx: DeliveryContext,
  action: DeliveryAction,
  force: boolean,
): Promise<{ rcon: boolean; discord: boolean }> {
  const map = RCON_COMMANDS[ctx.package_slug];

  if (!map && ctx.package_slug !== "support") {
    const message = `Unsupported package slug: ${ctx.package_slug || "(empty)"}`;
    console.error("[delivery]", message, { orderId: ctx.order_id });

    await logDelivery({
      order_id: ctx.order_id,
      type: "rust_rcon",
      action,
      status: "failed",
      target: ctx.steam_id,
      command: null,
      request: { slug: ctx.package_slug },
      response: null,
      error: message,
    });

    await logDelivery({
      order_id: ctx.order_id,
      type: "discord_role",
      action,
      status: "failed",
      target: ctx.discord_id,
      command: null,
      request: { slug: ctx.package_slug },
      response: null,
      error: message,
    });

    return { rcon: false, discord: false };
  }

  let rconOk = true; // Support package has no Rust step.
  let discordOk = true;

  // ---- Rust RCON step (skip for support package) ----
  if (map) {
    const previouslySucceeded =
      !force &&
      (await wasStepSuccessful(
        ctx.order_id,
        "rust_rcon",
        action,
      ));

    if (!previouslySucceeded) {
      if (!ctx.steam_id) {
        rconOk = false;
        await logDelivery({
          order_id: ctx.order_id,
          type: "rust_rcon",
          action,
          status: "failed",
          target: null,
          command: null,
          request: { slug: ctx.package_slug },
          response: null,
          error: "No steam_id linked",
        });
      } else {
        const command =
          action === "grant"
            ? `${map.add} ${ctx.steam_id} ${ctx.duration_days}`
            : `${map.remove} ${ctx.steam_id} shop_${action}`;

        const result = await sendRconCommand(command);
        rconOk = result.ok;

        await logDelivery({
          order_id: ctx.order_id,
          type: "rust_rcon",
          action,
          status: result.ok ? "success" : "failed",
          target: ctx.steam_id,
          command,
          request: {
            command,
            steam_id: ctx.steam_id,
            package_slug: ctx.package_slug,
            duration_days: ctx.duration_days,
          },
          response: {
            message: result.message,
            error: result.error,
          },
          error: result.error ?? null,
        });
      }
    }
  }

  // ---- Discord role step ----
  const roleEnv = map
    ? map.roleEnv
    : ctx.package_slug === "support"
      ? SUPPORTER_ROLE_ENV
      : null;

  if (!roleEnv) {
    discordOk = false;
  } else {
    const roleId = process.env[roleEnv]?.trim() || null;
    const previouslySucceeded =
      !force &&
      (await wasStepSuccessful(
        ctx.order_id,
        "discord_role",
        action,
      ));

    if (!previouslySucceeded) {
      if (!roleId) {
        discordOk = false;
        await logDelivery({
          order_id: ctx.order_id,
          type: "discord_role",
          action,
          status: "failed",
          target: ctx.discord_id,
          command: null,
          request: {
            role_env: roleEnv,
            user_id: ctx.discord_id,
          },
          response: null,
          error: `Missing environment variable: ${roleEnv}`,
        });
      } else if (!ctx.discord_id) {
        discordOk = false;
        await logDelivery({
          order_id: ctx.order_id,
          type: "discord_role",
          action,
          status: "failed",
          target: null,
          command: `discord_role:${action}:${roleId}`,
          request: {
            role_id: roleId,
            role_env: roleEnv,
          },
          response: null,
          error: "No discord_id linked",
        });
      } else {
        const result = await discordRoleCall(
          action,
          ctx.discord_id,
          roleId,
        );

        discordOk = result.ok;

        await logDelivery({
          order_id: ctx.order_id,
          type: "discord_role",
          action,
          status: result.ok ? "success" : "failed",
          target: ctx.discord_id,
          command: `discord_role:${action}:${roleId}`,
          request: {
            role_id: roleId,
            role_env: roleEnv,
            user_id: ctx.discord_id,
            package_slug: ctx.package_slug,
          },
          response: {
            status: result.status,
            body: result.body.slice(0, 500),
          },
          error: result.ok
            ? null
            : result.status === 0
              ? result.body.slice(0, 200)
              : `HTTP ${result.status}: ${result.body.slice(0, 200)}`,
        });
      }
    }
  }

  return { rcon: rconOk, discord: discordOk };
}

export async function activateOrderAndDeliver(
  orderId: string,
): Promise<{ rcon: boolean; discord: boolean }> {
  const loaded = await loadOrder(orderId);
  if (!loaded) return { rcon: false, discord: false };

  // A resent Stripe webhook must not reset or extend an already-active order.
  if (loaded.status !== "active") {
    const now = new Date();
    const expires = new Date(
      now.getTime() +
        loaded.ctx.duration_days * 24 * 60 * 60 * 1000,
    );

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "active" as const,
        activated_at: now.toISOString(),
        expires_at: expires.toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("[delivery] order activation failed", {
        orderId,
        error: error.message,
      });
      throw new Error(`Order activation failed: ${error.message}`);
    }
  }

  return runDelivery(loaded.ctx, "grant", false);
}

