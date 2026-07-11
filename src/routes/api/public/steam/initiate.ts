import { createFileRoute } from "@tanstack/react-router";

// GET /api/public/steam/initiate?uid=<user_id>
// Redirects the user to Steam's OpenID login. On success, Steam sends the user
// back to /api/public/steam/verify where we exchange the response for a SteamID64.
export const Route = createFileRoute("/api/public/steam/initiate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const uid = url.searchParams.get("uid");
        if (!uid) return new Response("Missing uid", { status: 400 });

        const origin = process.env.PUBLIC_APP_URL || url.origin;
        const returnTo = `${origin}/api/public/steam/verify?uid=${encodeURIComponent(uid)}`;

        const params = new URLSearchParams({
          "openid.ns": "http://specs.openid.net/auth/2.0",
          "openid.mode": "checkid_setup",
          "openid.return_to": returnTo,
          "openid.realm": origin,
          "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
          "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
        });

        return Response.redirect(`https://steamcommunity.com/openid/login?${params}`, 302);
      },
    },
  },
});
