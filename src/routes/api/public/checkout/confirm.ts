import { createFileRoute } from "@tanstack/react-router";

// GET /api/public/checkout/confirm?order=<order_id>
// Safety net: if the Stripe webhook hasn't fired yet, the success page hits
// this endpoint. We re-check the Stripe session and, if paid, activate + deliver.
export const Route = createFileRoute("/api/public/checkout/confirm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("order");
        if (!orderId) return Response.json({ error: "order required" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin
          .from("orders").select("*").eq("id", orderId).maybeSingle();
        if (!order) return Response.json({ error: "not found" }, { status: 404 });
        if (order.status === "active") return Response.json({ status: "active" });

        const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_API_KEY;
        if (!stripeKey || !order.stripe_checkout_session_id) {
          return Response.json({ status: order.status });
        }

        const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${order.stripe_checkout_session_id}`, {
          headers: { authorization: `Bearer ${stripeKey}` },
        });
        const s = await r.json() as any;
        if (s?.payment_status === "paid") {
          const { activateOrderAndDeliver } = await import("@/lib/delivery.server");
          await supabaseAdmin.from("orders").update({
            stripe_payment_intent_id: s.payment_intent ?? null,
          }).eq("id", orderId);
          await activateOrderAndDeliver(orderId);
          return Response.json({ status: "active" });
        }
        return Response.json({ status: order.status, stripe: s?.payment_status });
      },
    },
  },
});
