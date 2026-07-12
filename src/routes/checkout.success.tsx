import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Package } from "lucide-react";
import { useEffect, useState } from "react";

type Search = { order?: string };

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    order: typeof s.order === "string" ? s.order : undefined,
  }),
  head: () => ({ meta: [{ title: "Payment received — Cobalt Rust EU" }] }),
  component: Success,
});

function Success() {
  const { order } = Route.useSearch();
  const [status, setStatus] = useState<"pending" | "active" | "unknown">("pending");

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/public/checkout/confirm?order=${order}`);
        const j = await r.json();
        if (!cancelled) setStatus(j.status === "active" ? "active" : "pending");
      } catch { /* ignore */ }
    };
    tick();
    const iv = setInterval(tick, 3000);
    const stop = setTimeout(() => { setStatus((s) => s === "active" ? s : "unknown"); clearInterval(iv); }, 30000);
    return () => { cancelled = true; clearInterval(iv); clearTimeout(stop); };
  }, [order]);

  return (
    <div className="container-shop py-12 md:py-24 flex justify-center">
      <div className="max-w-md text-center px-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-success/15 border border-success/40 flex items-center justify-center">
          {status === "active" ? <CheckCircle2 className="w-10 h-10 text-success" /> : <Loader2 className="w-10 h-10 text-success animate-spin" />}
        </div>
        <h1 className="mt-6 text-2xl md:text-3xl font-bold">
          {status === "active" ? "Rank delivered" : "Payment received"}
        </h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground">
          {status === "active"
            ? "Your rank is live on the Rust server and your Discord role has been assigned."
            : "Delivering your rank and Discord role — this usually takes a few seconds."}
        </p>
        {order && <p className="mt-2 text-xs text-muted-foreground font-mono break-all">Order {order.slice(0, 8)}…</p>}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/account" className="btn-primary px-5 py-2.5 rounded-md font-semibold text-sm">
            <Package className="w-4 h-4 inline mr-2" />My purchases
          </Link>
          <Link to="/store" className="px-5 py-2.5 rounded-md border border-border hover:bg-secondary/60 text-sm font-medium">
            Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}
