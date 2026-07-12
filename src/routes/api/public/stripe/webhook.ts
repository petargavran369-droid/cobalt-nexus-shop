import { createFileRoute } from "@tanstack/react-router";

// Stripe webhook — activates order + triggers delivery on checkout.session.completed
// Set the webhook secret as STRIPE_WEBHOOK_SECRET; falls back to trusting the
// event when the secret is not set (test-mode convenience).
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("stripe-signature") || "";
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (whSecret) {
          const ok = await verifyStripeSignature(raw, signature, whSecret);
          if (!ok) return new Response("Invalid signature", { status: 401 });
        }

        let event: any;
        try { event = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

        if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
          return new Response("ignored", { status: 200 });
        }

        const session = event.data?.object;
        const orderId: string | undefined = session?.metadata?.order_id || session?.client_reference_id;
        if (!orderId) return new Response("no order_id", { status: 400 });

        try {
          const { activateOrderAndDeliver } = await import("@/lib/delivery.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("orders").update({
            stripe_payment_intent_id: session.payment_intent ?? null,
          }).eq("id", orderId);
          await activateOrderAndDeliver(orderId);
        } catch (e: any) {
          console.error("[stripe.webhook] delivery error", e?.message);
          // Still 200 so Stripe stops retrying storms; admin can retry manually.
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  // Header format: t=timestamp,v1=sig,v1=sig2
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")).map(([k, v]) => [k, v]));
  const t = parts["t"]; const v1 = parts["v1"];
  if (!t || !v1) return false;
  const signedPayload = `${t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  // constant-time-ish compare
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
