import { createFileRoute } from "@tanstack/react-router";

// GET /api/public/steam/verify?uid=<user_id>&openid.*=...
// Verifies Steam's OpenID response with Steam, extracts the SteamID64,
// updates the profile row (via service role), then redirects to /account.
export const Route = createFileRoute("/api/public/steam/verify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const uid = url.searchParams.get("uid");
        if (!uid) return redirectToAccount("missing_uid");

        // Rebuild the verification body: same params, but openid.mode=check_authentication
        const params = new URLSearchParams();
        for (const [k, v] of url.searchParams.entries()) {
          if (k.startsWith("openid.")) params.set(k, v);
        }
        if (!params.has("openid.mode")) return redirectToAccount("bad_response");
        params.set("openid.mode", "check_authentication");

        const verify = await fetch("https://steamcommunity.com/openid/login", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }).then(r => r.text()).catch(() => "");

        if (!/is_valid\s*:\s*true/i.test(verify)) return redirectToAccount("verification_failed");

        const claimed = url.searchParams.get("openid.claimed_id") || "";
        const match = claimed.match(/\/openid\/id\/(\d{17})$/);
        if (!match) return redirectToAccount("no_steamid");
        const steamId = match[1];

        // Optional: fetch player summary (only if a Steam Web API key is configured)
        let steamName: string | null = null;
        const apiKey = process.env.STEAM_WEB_API_KEY;
        if (apiKey) {
          try {
            const r = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`);
            const j = await r.json() as any;
            steamName = j?.response?.players?.[0]?.personaname ?? null;
          } catch { /* ignore */ }
        }

        // Update profile via service role
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ steam_id: steamId, steam_name: steamName })
          .eq("id", uid);

        if (error) {
          console.error("[steam.verify] update failed", error);
          return redirectToAccount(encodeURIComponent(error.message));
        }

        return Response.redirect(new URL("/account?linked=steam", url.origin), 302);
      },
    },
  },
});

function redirectToAccount(err: string) {
  return new Response(null, {
    status: 302,
    headers: { location: `/account?error=${err}` },
  });
}
