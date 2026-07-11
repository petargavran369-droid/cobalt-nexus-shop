import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import { fetchPackageBySlug } from "@/lib/packages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { tierFromSlug, tierMeta } from "@/lib/tier";
import { imageForSlug } from "@/lib/package-images";

export const Route = createFileRoute("/checkout/$slug")({
  head: () => ({ meta: [{ title: "Checkout — Cobalt Rust EU" }] }),
  component: Checkout,
});

const supportAmounts = [5, 10, 20, 50];

function Checkout() {
  const { slug } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(10);

  const { data: pkg, isLoading } = useQuery({
    queryKey: ["package", slug], queryFn: () => fetchPackageBySlug(slug),
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  if (loading || isLoading) return <div className="container-shop py-16 text-center text-muted-foreground">Loading…</div>;
  if (!user) throw redirect({ to: "/auth", search: { redirect: `/checkout/${slug}` } as any });
  if (!pkg) return <div className="container-shop py-16 text-center">Package not found. <Link to="/store" className="text-primary">Back to store</Link></div>;

  const tier = tierFromSlug(pkg.slug);
  const meta = tierMeta[tier];
  const isSupport = pkg.slug === "support";
  const needsDiscord = ["queue-priority", "vip", "vip-plus", "support"].includes(pkg.slug);
  const hasSteam = !!profile?.steam_id;
  const hasDiscord = !!profile?.discord_id;

  const requiresSteam = pkg.slug !== "support"; // support is donation only
  const blocked = (requiresSteam && !hasSteam) || (needsDiscord && !hasDiscord && pkg.slug !== "support"); // allow discord missing for support? spec says supporter needs discord; enforce.
  const blockedForSupport = pkg.slug === "support" && !hasDiscord ? false : blocked; // don't hard-block support without discord

  const amount = isSupport ? customAmount : Number(pkg.price_eur);

  const startCheckout = async () => {
    if (requiresSteam && !hasSteam) { toast.error("Link your Steam account first"); return; }
    if (needsDiscord && !hasDiscord && !isSupport) { toast.error("Link your Discord account for this package"); return; }
    if (isSupport && (!Number.isFinite(amount) || amount < 1)) { toast.error("Enter a valid amount"); return; }

    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/public/checkout/create", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ package_slug: pkg.slug, amount_eur: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.checkout_url) window.location.href = data.checkout_url;
      else { toast.error("Checkout not configured yet"); setBusy(false); }
    } catch (err: any) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="container-shop py-8 md:py-12 max-w-4xl">
      <Link to="/packages/$slug" params={{ slug: pkg.slug }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to package
      </Link>

      <h1 className="text-3xl md:text-4xl font-bold">Checkout</h1>

      <div className="mt-8 grid md:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Account checks */}
          <div className="panel p-6">
            <h2 className="text-lg font-bold">Account status</h2>
            <div className="mt-4 space-y-3">
              <Row label="Steam" ok={hasSteam} value={profile?.steam_name || profile?.steam_id} linkTo="/link-steam" required={requiresSteam} />
              <Row label="Discord" ok={hasDiscord} value={profile?.discord_username} linkTo="/link-discord" required={needsDiscord && !isSupport} />
            </div>
          </div>

          {isSupport && (
            <div className="panel p-6">
              <h2 className="text-lg font-bold">Donation amount</h2>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {supportAmounts.map(a => (
                  <button key={a} type="button" onClick={() => setCustomAmount(a)}
                    className={`py-2.5 rounded-md border text-sm font-semibold ${customAmount === a ? "border-primary bg-primary/15 text-primary-glow" : "border-border bg-secondary/40"}`}>
                    €{a}
                  </button>
                ))}
              </div>
              <label className="block mt-3">
                <span className="text-xs text-muted-foreground">Custom amount (EUR)</span>
                <input type="number" min={1} max={500} value={customAmount} onChange={e => setCustomAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2.5 outline-none text-sm focus:border-primary" />
              </label>
            </div>
          )}

          <div className="panel p-6">
            <h2 className="text-lg font-bold">Payment</h2>
            <p className="text-sm text-muted-foreground mt-1">Secure checkout via Stripe. Cards, Apple Pay, Google Pay.</p>
            <button onClick={startCheckout} disabled={busy || blockedForSupport}
              className="btn-primary mt-5 w-full py-4 rounded-lg font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60">
              <CreditCard className="w-5 h-5" /> Pay €{amount.toFixed(2)} securely
            </button>
            {blockedForSupport && (
              <p className="mt-3 text-xs text-destructive">Link required accounts before continuing.</p>
            )}
          </div>
        </div>

        <aside className="panel-elevated p-5 h-fit sticky top-20">
          <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">Your order</div>
          <div className="flex gap-3">
            <img src={imageForSlug(pkg.slug)} alt="" width={64} height={64} className="w-16 h-16 rounded object-cover" />
            <div>
              <div className={`text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded inline-block ${meta.badgeClass}`}>{meta.label}</div>
              <div className="font-semibold mt-1">{pkg.name}</div>
              <div className="text-xs text-muted-foreground">{pkg.duration_days ? `${pkg.duration_days} days` : "One-time"}</div>
            </div>
          </div>
          <div className="border-t border-border mt-4 pt-4 flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold" style={{ color: meta.accentVar }}>€{amount.toFixed(2)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, ok, value, linkTo, required }: { label: string; ok: boolean; value?: string | null; linkTo: string; required: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className={`w-4 h-4 ${required ? "text-destructive" : "text-muted-foreground"}`} />}
        <span className="font-medium">{label}</span>
        {required && !ok && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive uppercase">Required</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {value && <span className="truncate max-w-[140px]">{value}</span>}
        <Link to={linkTo} className="text-primary hover:underline">{ok ? "change" : "link"}</Link>
      </div>
    </div>
  );
}
