import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Cobalt Rust EU" }] }),
  component: Admin,
});

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "failed">("all");

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

  if (loading) return <div className="container-shop py-16 text-center text-muted-foreground">Loading…</div>;
  if (!user) throw redirect({ to: "/auth", search: { redirect: "/admin" } as any });
  if (!isAdmin) return (
    <div className="container-shop py-16 text-center">
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

  return (
    <div className="container-shop py-8 md:py-12">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-tier-vip" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total orders" value={stats.total} />
        <Stat label="Active" value={stats.active} accent="var(--success)" />
        <Stat label="Revenue" value={`€${stats.revenue.toFixed(0)}`} accent="var(--tier-vip)" />
        <Stat label="Failed" value={stats.failed} accent="var(--destructive)" />
      </div>

      <div className="mt-8 panel p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1 flex items-center gap-2 rounded-md border border-border bg-input px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by SteamID64, Discord username, email…"
            className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <div className="flex gap-1">
          {(["all","active","expired","failed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-md text-xs font-medium uppercase tracking-wider ${filter === f ? "btn-primary" : "border border-border bg-secondary/40"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
            <tr>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Package</th>
              <th className="text-left px-4 py-3">SteamID64</th>
              <th className="text-left px-4 py-3">Discord</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No orders found.</td></tr>
            ) : filtered.map((o: any) => (
              <tr key={o.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3">{o.profiles?.email}</td>
                <td className="px-4 py-3">{o.packages?.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{o.steam_id || o.profiles?.steam_id || "—"}</td>
                <td className="px-4 py-3">{o.profiles?.discord_username || "—"}</td>
                <td className="px-4 py-3">€{Number(o.amount_paid || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider">{o.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{o.expires_at ? new Date(o.expires_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Action buttons (re-run delivery, manually expire, refund) come in Phase 2 alongside WebRCON &amp; Discord bot integration.
      </p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}
