import { createFileRoute } from "@tanstack/react-router";

// GET /api/public/discord/callback?code=...&state=<user_id>
export const Route = createFileRoute("/api/public/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const uid = url.searchParams.get("state");
        if (!code || !uid) return redirectErr("missing_params", url.origin);

        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        if (!clientId || !clientSecret) return redirectErr("discord_not_configured", url.origin);

        const origin = process.env.PUBLIC_APP_URL || url.origin;
        const redirectUri = `${origin}/api/public/discord/callback`;

        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
          }),
        });
        if (!tokenRes.ok) return redirectErr("token_exchange_failed", url.origin);
        const token = await tokenRes.json() as { access_token: string };

        const meRes = await fetch("https://discord.com/api/users/@me", {
          headers: { authorization: `Bearer ${token.access_token}` },
        });
        if (!meRes.ok) return redirectErr("user_fetch_failed", url.origin);
        const me = await meRes.json() as { id: string; username: string; global_name?: string };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            discord_id: me.id,
            discord_username: me.global_name || me.username,
          })
          .eq("id", uid);
        if (error) return redirectErr(encodeURIComponent(error.message), url.origin);

        return Response.redirect(new URL("/account?linked=discord", url.origin), 302);
      },
    },
  },
});

function redirectErr(err: string, origin: string) {
  return Response.redirect(new URL(`/account?error=${err}`, origin), 302);
}
