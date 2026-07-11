import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Package } from "lucide-react";

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
  return (
    <div className="container-shop py-16 md:py-24 flex justify-center">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-success/15 border border-success/40 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Payment received</h1>
        <p className="mt-3 text-muted-foreground">
          Thanks for supporting Cobalt Rust EU. Your rank and Discord role will be delivered automatically
          within a few moments. You'll see it in <Link to="/account" className="text-primary hover:underline">My Account</Link>.
        </p>
        {order && <p className="mt-2 text-xs text-muted-foreground font-mono">Order {order.slice(0, 8)}…</p>}
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/account" className="btn-primary px-5 py-2.5 rounded-md font-semibold text-sm">
            <Package className="w-4 h-4 inline mr-2" />View my purchases
          </Link>
          <Link to="/store" className="px-5 py-2.5 rounded-md border border-border hover:bg-secondary/60 text-sm font-medium">
            Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}
