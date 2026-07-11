import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms & Refund Policy — Cobalt Rust EU" },
    { name: "description", content: "Terms of service and refund policy for Cobalt Rust EU." },
  ]}),
  component: Terms,
});

function Terms() {
  return (
    <div className="container-shop py-12 md:py-16 max-w-3xl">
      <h1 className="text-4xl md:text-5xl font-bold">Terms & Refund Policy</h1>
      <p className="mt-2 text-muted-foreground">Last updated {new Date().toLocaleDateString()}.</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed">
        <section className="panel p-6">
          <h2 className="text-lg font-bold mb-2">Fair play promise</h2>
          <p className="text-muted-foreground">
            Rust Cobalt EU is an unofficial community server and is <strong className="text-foreground">not affiliated with Facepunch Studios</strong>.
            All VIP perks are cosmetic or quality-of-life only. We do not sell kits, gather boosts, damage advantages,
            recoil advantages, raid advantages, or any pay-to-win features.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">1. What you're buying</h2>
          <p className="text-muted-foreground">
            All packages are one-time payments in EUR granting 30 days of access (except Support, which is a donation and grants no in-game perks).
            Access includes optional cosmetic and QoL features and a Discord role. Access expires automatically after 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">2. Delivery</h2>
          <p className="text-muted-foreground">
            After successful payment, your Rust server rank is delivered via WebRCON and your Discord role is applied
            through our bot. Delivery is usually instant. If delivery fails, contact support and we will manually resolve it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">3. Refunds</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Refunds are available within 24 hours of purchase if the package has not yet been delivered or used.</li>
            <li>Once your rank has been active and used in-game, refunds are at our discretion.</li>
            <li>Refunds automatically revoke your Rust rank and remove your Discord role.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">4. Chargebacks</h2>
          <p className="text-muted-foreground">
            Filing a chargeback instead of contacting support will result in a permanent ban from purchasing and
            immediate removal of all VIP access. This is enforced automatically.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">5. Personal use only</h2>
          <p className="text-muted-foreground">
            Packages are tied to your SteamID64 and are non-transferable. Sharing or reselling VIP access is prohibited
            and may result in removal without refund.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">6. Rule violations</h2>
          <p className="text-muted-foreground">
            Cheating, macro abuse, harassment, or other rule violations may result in the immediate removal of VIP access
            without refund.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">7. Contact</h2>
          <p className="text-muted-foreground">
            Questions? Reach out through our <a href="/support" className="text-primary hover:underline">Support</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
