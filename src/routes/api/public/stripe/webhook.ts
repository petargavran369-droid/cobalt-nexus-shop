import { createFileRoute } from "@tanstack/react-router";

// Stripe webhook — activates order + triggers delivery on checkout.session.completed
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
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("bad json", { status: 400 });
        }

        if (
          event.type !== "checkout.session.completed" &&
          event.type !== "checkout.session.async_payment_succeeded"
        ) {
          return new Response("ignored", { status: 200 });
        }

        const session = event.data?.object;
        const orderId: string | undefined =
          session?.metadata?.order_id || session?.client_reference_id;

        if (!orderId) {
          return new Response("no order_id", { status: 400 });
        }

        try {
          const { activateOrderAndDeliver } =
            await import("@/lib/delivery.server");
          const { supabaseAdmin } =
            await import("@/integrations/supabase/client.server");

          const { error: paymentUpdateError } = await supabaseAdmin
            .from("orders")
            .update({
              stripe_payment_intent_id: session.payment_intent ?? null,
            })
            .eq("id", orderId);

          if (paymentUpdateError) {
            throw new Error(
              `Payment intent update failed: ${paymentUpdateError.message}`,
            );
          }

          const result = await activateOrderAndDeliver(orderId);

          console.log("[stripe.webhook] delivery result", {
            orderId,
            rcon: result.rcon,
            discord: result.discord,
          });

          // Critical: do not return 200 when delivery.server.ts merely returns
          // { rcon: false } without throwing.
          if (!result.rcon) {
            return new Response(
              `delivery error: Rust RCON delivery returned false (discord=${result.discord})`,
              { status: 500 },
            );
          }

          return new Response(
            JSON.stringify({
              ok: true,
              orderId,
              rcon: result.rcon,
              discord: result.discord,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        } catch (error: any) {
          console.error(
            "[stripe.webhook] delivery error",
            error?.message,
            error?.stack,
          );

          return new Response(
            `delivery error: ${error?.message || "Unknown error"}`,
            { status: 500 },
          );
        }
      },
    },
  },
});

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const entries = header
    .split(",")
    .map((part) => part.split("="))
    .filter(([key, value]) => key && value);

  const parts = Object.fromEntries(entries);
  const timestamp = parts["t"];
  const signatures = header
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload),
  );

  const expectedHex = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((candidate) => constantTimeEqual(expectedHex, candidate));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}
