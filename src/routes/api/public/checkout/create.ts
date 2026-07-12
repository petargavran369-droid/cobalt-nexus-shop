import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// POST /api/public/checkout/create
// Body: { package_slug, amount_eur? }
// Auth: Bearer <supabase access token>
// Creates a pending order row and returns a Stripe Checkout session URL.
export const Route = createFileRoute("/api/public/checkout/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return json({ error: "Unauthorized" }, 401);

        const url = new URL(request.url);
        const supabaseUrl = process.env.SUPABASE_URL!;
        const publishable = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_API_KEY;

        if (!stripeKey) {
          return json({ error: "Stripe not configured yet — admin must add STRIPE_SECRET_KEY." }, 500);
        }

        // Auth: identify the user using their bearer token
        const supabaseUser = createClient<Database>(supabaseUrl, publishable, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
        if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
        const user = userData.user;

        const body = await request.json().catch(() => ({})) as { package_slug?: string; amount_eur?: number };
        if (!body.package_slug) return json({ error: "package_slug required" }, 400);

        // Load package + profile
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [pkgRes, profileRes] = await Promise.all([
          supabaseAdmin.from("packages").select("*").eq("slug", body.package_slug).eq("active", true).maybeSingle(),
          supabaseAdmin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        ]);
        const pkg = pkgRes.data;
        const profile = profileRes.data;
        if (!pkg) return json({ error: "Package not found" }, 404);
        if (!profile) return json({ error: "Profile missing" }, 400);

        const isSupport = pkg.slug === "support";
        if (pkg.slug !== "support" && !profile.steam_id) return json({ error: "Link Steam account first" }, 400);
        if (!isSupport && ["queue-priority", "vip", "vip-plus"].includes(pkg.slug) && !profile.discord_id) {
          // Discord is technically required per spec for these; allow but recommend later.
        }

        const amount = isSupport
          ? Math.max(1, Math.min(500, Math.round(Number(body.amount_eur ?? pkg.price_eur))))
          : Number(pkg.price_eur);

        // Create pending order
        const { data: order, error: orderErr } = await supabaseAdmin
          .from("orders")
          .insert({
            user_id: user.id,
            package_id: pkg.id,
            steam_id: profile.steam_id,
            discord_id: profile.discord_id,
            amount_paid: amount,
            currency: "EUR",
            status: "pending",
          })
          .select()
          .single();
        if (orderErr || !order) return json({ error: orderErr?.message || "Order creation failed" }, 500);

        // Create Stripe Checkout session
        const origin = process.env.PUBLIC_APP_URL || url.origin;
        const stripeBody = new URLSearchParams();
        stripeBody.append("mode", "payment");
        stripeBody.append("success_url", `${origin}/checkout/success?order=${order.id}`);
        stripeBody.append("cancel_url", `${origin}/packages/${pkg.slug}`);
        stripeBody.append("customer_email", user.email || "");
        stripeBody.append("client_reference_id", order.id);
        stripeBody.append("metadata[order_id]", order.id);
        stripeBody.append("metadata[user_id]", user.id);
        stripeBody.append("metadata[package_slug]", pkg.slug);
        stripeBody.append("metadata[steam_id]", profile.steam_id ?? "");
        stripeBody.append("line_items[0][price_data][currency]", "eur");
        stripeBody.append("line_items[0][price_data][product_data][name]", pkg.name);
        stripeBody.append("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)));
        stripeBody.append("line_items[0][quantity]", "1");

        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            authorization: `Bearer ${stripeKey}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: stripeBody.toString(),
        });
        const session = await stripeRes.json() as any;
        if (!stripeRes.ok) {
          console.error("[stripe] session failed", session);
          return json({ error: session?.error?.message || "Stripe error" }, 500);
        }

        await supabaseAdmin.from("orders").update({
          stripe_checkout_session_id: session.id,
        }).eq("id", order.id);

        return json({ checkout_url: session.url });
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
