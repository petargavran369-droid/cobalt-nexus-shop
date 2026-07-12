import { createFileRoute, redirect, Link, useServerFn } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCcw, Search, Shield, XCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { adminRetryDelivery, adminExpireNow, adminReactivateOrder } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Cobalt Rust EU" }] }),
  component: Admin,
});

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "failed">("all");
  const [tab, setTab] = useState<"orders" | "deliveries">("orders");
  const qc = useQueryClient();

  const retryFn = useServerFn(adminRetryDelivery);
  const expireFn = useServerFn(adminExpireNow);
  const reactivateFn = useServerFn(adminReactivateOrder);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", filter],
    enabled: !!isAdmin,
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, packages(name,slug), profiles!inner(email,steam_id,steam_name,discord_username)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "active") query = query.eq("status", "active");
      else if (filter === "expired") query = query.eq("status", "expired");
      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["admin-deliveries"],
    enabled: !!isAdmin && tab === "deliveries",
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries").select("*, orders(id, packages(name))")
        .order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  if (loading) return <div className="container-shop py-16 text-center text-muted-foreground">Loading…</div>;
  if (!user) throw redirect({ to: "/auth", search: { redirect: "/admin" } as any });
  if (!isAdmin) return (
    <div className="container-shop py-16 text-center px-4">
      <Shield className="w-12 h-12 mx-auto text-destructive" />
      <h1 className="mt-4 text-2xl font-bold">Access denied</h1>
      <p className="mt-2 text-muted-foreground">Admin privileges required.</p>
      <Link to="/" className="mt-6 inline-block text-primary">Home</Link>
    </div>
  );

  const filtered = orders.filter((o: any) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      o.profiles?.email?.toLowerCase().includes(s) ||
      o.profiles?.steam_id?.includes(s) ||
      o.steam_id?.includes(s) ||
      o.profiles?.steam_name?.toLowerCase().includes(s) ||
      o.profiles?.discord_username?.toLowerCase().includes(s)
    );
  });

  const stats = {
    total: orders.length,
    active: orders.filter((o: any) => o.status === "active").length,
    revenue: orders.filter((o: any) => ["active","paid","expired"].includes(o.status)).reduce((a: number, o: any) => a + Number(o.amount_paid || 0), 0),
    failed: orders.filter((o: any) => o.status === "failed").length,
  };

  const runRetry = async (orderId: string, action: "grant" | "revoke") => {
    try {
      await retryFn({ data: { order_id: orderId, type: "both", action } });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-deliveries"] });
    } catch (e: any) { alert(e?.message || "Retry failed"); }
  };
  const runExpire = async (orderId: string) => {
    if (!confirm("Expire this order now (revoke rank + Discord role)?")) return;
    try { await expireFn({ data: { order_id: orderId } }); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
    catch (e: any) { alert(e?.message || "Failed"); }
  };
  const runReactivate = async (orderId: string) => {
    try { await reactivateFn({ data: { order_id: orderId } }); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
    catch (e: any) { alert(e?.message || "Failed"); }
  };

  return (
    <div className="container-shop py-6 md:py-12 px-4">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-tier-vip" />
        <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total orders" value={stats.total} />
        <Stat label="Active" value={stats.active} accent="var(--success)" />
        <Stat label="Revenue" value={`€${stats.revenue.toFixed(0)}`} accent="var(--tier-vip)" />
        <Stat label="Failed" value={stats.failed} accent="var(--destructive)" />
      </div>

      <div className="mt-6 flex gap-1 border-b border-border">
        {(["orders","deliveries"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium uppercase tracking-wider ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <>
          <div className="mt-4 panel p-3 md:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="flex-1 flex items-center gap-2 rounded-md border border-border bg-input px-3 py-2 min-w-0">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search SteamID64, Discord, email…"
                className="flex-1 min-w-0 bg-transparent outline-none text-sm" />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {(["all","active","expired","failed"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-md text-xs font-medium uppercase tracking-wider whitespace-nowrap ${filter === f ? "btn-primary" : "border border-border bg-secondary/40"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 panel overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left px-3 py-3">User</th>
                  <th className="text-left px-3 py-3">Package</th>
                  <th className="text-left px-3 py-3">SteamID64</th>
                  <th className="text-left px-3 py-3">Discord</th>
                  <th className="text-left px-3 py-3">€</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Expires</th>
                  <th className="text-right px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No orders found.</td></tr>
                ) : filtered.map((o: any) => (
                  <tr key={o.id} className="hover:bg-secondary/30">
                    <td className="px-3 py-3 whitespace-nowrap max-w-[180px] truncate">{o.profiles?.email}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{o.packages?.name}</td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">{o.steam_id || o.profiles?.steam_id || "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{o.profiles?.discord_username || "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap">€{Number(o.amount_paid || 0).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold uppercase tracking-wider ${o.status === "active" ? "text-success" : o.status === "failed" ? "text-destructive" : ""}`}>{o.status}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{o.expires_at ? new Date(o.expires_at).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button title="Retry delivery" onClick={() => runRetry(o.id, "grant")}
                          className="p-1.5 rounded border border-border hover:bg-secondary/60"><RefreshCcw className="w-3.5 h-3.5" /></button>
                        {o.status === "expired" || o.status === "failed" ? (
                          <button title="Re-activate + deliver" onClick={() => runReactivate(o.id)}
                            className="p-1.5 rounded border border-border hover:bg-secondary/60"><Play className="w-3.5 h-3.5" /></button>
                        ) : (
                          <button title="Expire now (revoke)" onClick={() => runExpire(o.id)}
                            className="p-1.5 rounded border border-border hover:bg-destructive/20 text-destructive"><XCircle className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "deliveries" && (
        <div className="mt-4 panel overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
              <tr>
                <th className="text-left px-3 py-3">When</th>
                <th className="text-left px-3 py-3">Type</th>
                <th className="text-left px-3 py-3">Action</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Package</th>
                <th className="text-left px-3 py-3">Error / Message</th>
                <th className="text-right px-3 py-3">Retry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deliveries.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No deliveries yet.</td></tr>
              ) : deliveries.map((d: any) => (
                <tr key={d.id} className="hover:bg-secondary/30">
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(d.created_at).toLocaleString()}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{d.type}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{d.action}</td>
                  <td className={`px-3 py-3 font-medium ${d.status === "success" ? "text-success" : "text-destructive"}`}>{d.status}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{d.orders?.packages?.name ?? "—"}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground max-w-[280px] truncate" title={d.error_message ?? ""}>{d.error_message || "—"}</td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => runRetry(d.order_id, d.action === "revoke" ? "revoke" : "grant")}
                      className="p-1.5 rounded border border-border hover:bg-secondary/60"><RefreshCcw className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="panel p-3 md:p-4">
      <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl md:text-2xl font-bold" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}
