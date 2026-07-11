import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, User as UserIcon, ExternalLink, Package as PackIcon, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { tierFromSlug, tierMeta } from "@/lib/tier";

type AccountSearch = { linked?: string; error?: string };

export const Route = createFileRoute("/account")({
  validateSearch: (s: Record<string, unknown>): AccountSearch => ({
    linked: typeof s.linked === "string" ? s.linked : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  head: () => ({ meta: [{ title: "My Account — Cobalt Rust EU" }] }),
  component: Account,
});

function Account() {
  const { user, loading } = useAuth();
  const { linked, error } = Route.useSearch();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, packages(name, slug)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (linked === "steam") toast.success("Steam account linked");
    if (linked === "discord") toast.success("Discord account linked");
    if (error) toast.error(decodeURIComponent(error));
    if (linked || error) {
      qc.invalidateQueries({ queryKey: ["profile"] });
      window.history.replaceState({}, "", "/account");
    }
  }, [linked, error, qc]);

  if (loading) return <div className="container-shop py-16 text-center text-muted-foreground">Loading…</div>;
  if (!user) throw redirect({ to: "/auth", search: { redirect: "/account" } as any });

  const activeOrders = orders.filter(o => o.status === "active" || o.status === "paid");
  const pastOrders = orders.filter(o => !["active", "paid"].includes(o.status));

  return (
    <div className="container-shop py-8 md:py-12">
      <h1 className="text-3xl md:text-4xl font-bold">My Account</h1>
      <p className="text-muted-foreground mt-1">{user.email}</p>

      {/* Linked accounts */}
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <LinkCard
          title="Steam Account"
          value={profile?.steam_name || profile?.steam_id}
          linked={!!profile?.steam_id}
          link="/link-steam"
          required
        />
        <LinkCard
          title="Discord Account"
          value={profile?.discord_username}
          linked={!!profile?.discord_id}
          link="/link-discord"
        />
      </div>

      {/* Active */}
      <section className="mt-10">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PackIcon className="w-5 h-5 text-primary" /> Active Packages
        </h2>
        {activeOrders.length === 0 ? (
          <div className="mt-4 panel p-8 text-center text-muted-foreground">
            <p>No active packages.</p>
            <Link to="/store" className="mt-3 inline-flex btn-primary px-4 py-2 rounded-md text-sm">Browse store</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {activeOrders.map((o: any) => <OrderRow key={o.id} order={o} />)}
          </div>
        )}
      </section>

      {/* History */}
      <section className="mt-10">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-muted-foreground" /> Purchase History
        </h2>
        {pastOrders.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground">No past purchases yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {pastOrders.map((o: any) => <OrderRow key={o.id} order={o} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function LinkCard({ title, value, linked, link, required }: { title: string; value?: string | null; linked: boolean; link: string; required?: boolean }) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{title}</span>
            {required && !linked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive uppercase">Required</span>}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {linked ? (
              <><CheckCircle2 className="w-4 h-4 text-success" /> <span className="text-sm">{value || "Linked"}</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-muted-foreground" /> <span className="text-sm text-muted-foreground">Not linked</span></>
            )}
          </div>
        </div>
        <Link to={link} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-secondary/60 flex items-center gap-1">
          {linked ? "Manage" : "Link"} <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: any }) {
  const slug = order.packages?.slug ?? "";
  const meta = tierMeta[tierFromSlug(slug)];
  const status = order.status as string;
  const statusColor: Record<string, string> = {
    active: "text-success",
    paid: "text-primary",
    pending: "text-warning",
    expired: "text-muted-foreground",
    refunded: "text-muted-foreground",
    chargeback: "text-destructive",
    failed: "text-destructive",
  };
  return (
    <div className="panel p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-md" style={{ background: `color-mix(in oklab, ${meta.accentVar} 20%, transparent)` }} />
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{order.packages?.name}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString()} · €{Number(order.amount_paid || 0).toFixed(2)}
            {order.expires_at && <> · expires {new Date(order.expires_at).toLocaleDateString()}</>}
          </div>
        </div>
      </div>
      <span className={`text-xs font-bold uppercase tracking-wider ${statusColor[status] ?? ""}`}>{status}</span>
    </div>
  );
}
