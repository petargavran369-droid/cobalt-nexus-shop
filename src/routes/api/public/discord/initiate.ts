import { createFileRoute } from "@tanstack/react-router";

// GET /api/public/discord/initiate?uid=<user_id>
// Redirects to Discord OAuth2 authorize with identify scope.
export const Route = createFileRoute("/api/public/discord/initiate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const uid = url.searchParams.get("uid");
        if (!uid) return new Response("Missing uid", { status: 400 });

        const clientId = process.env.DISCORD_CLIENT_ID;
        if (!clientId) {
          return new Response(null, {
            status: 302,
            headers: { location: `/account?error=${encodeURIComponent("Discord not configured yet — admin must add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.")}` },
          });
        }

        const origin = process.env.PUBLIC_APP_URL || url.origin;
        const redirectUri = `${origin}/api/public/discord/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "identify",
          state: uid,
          prompt: "consent",
        });
        return Response.redirect(`https://discord.com/api/oauth2/authorize?${params}`, 302);
      },
    },
  },
});
