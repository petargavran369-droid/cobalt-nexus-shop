import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/link-steam")({
  head: () => ({ meta: [{ title: "Link Steam — Cobalt Rust EU" }] }),
  component: LinkSteam,
});

function LinkSteam() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="container-shop py-16 text-center text-muted-foreground">Loading…</div>;
  if (!user) throw redirect({ to: "/auth", search: { redirect: "/link-steam" } as any });

  const signInWithSteam = () => {
    // Redirect to our Steam OpenID initiate endpoint
    setBusy(true);
    window.location.href = `/api/public/steam/initiate?uid=${user.id}`;
  };

  const manualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const steamId = String(fd.get("steamid") ?? "").trim();
    if (!/^\d{17}$/.test(steamId)) {
      toast.error("SteamID64 must be exactly 17 digits");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ steam_id: steamId }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("SteamID saved");
    window.location.href = "/account?linked=steam";
  };

  return (
    <div className="container-shop py-8 md:py-12 max-w-2xl">
      <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Account
      </Link>

      <h1 className="text-3xl md:text-4xl font-bold">Link Steam</h1>
      <p className="mt-2 text-muted-foreground">
        We need your SteamID64 to deliver your Rust server rank. Sign in through Steam (recommended) or paste your ID manually.
      </p>

      <div className="mt-8 panel-elevated p-6">
        <div className="text-xs font-bold tracking-widest uppercase text-primary-glow mb-3">Recommended</div>
        <h2 className="text-xl font-bold">Sign in through Steam</h2>
        <p className="text-sm text-muted-foreground mt-1">Fast and error-proof. Uses Steam's official OpenID login.</p>
        <button onClick={signInWithSteam} disabled={busy} className="mt-4 btn-primary px-5 py-3 rounded-md font-semibold inline-flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.19 2.58 7.78 6.24 9.26l3.44-1.5A2.5 2.5 0 0114.5 15L17 12.44C17 9.99 15.01 8 12.56 8l-2.5 2.44 1.7 1.7c.06-.02.16-.02.24-.02a1.94 1.94 0 011.94 1.94c0 .08 0 .16-.02.24l1.7 1.7L18.5 13.5l1.4-1.4C21.13 10.75 22 8.99 22 7.16 22 4.31 19.7 2 16.86 2H12z"/></svg>
          Sign in through Steam <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-6 panel p-6">
        <h2 className="text-lg font-bold">Or paste your SteamID64</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Find it at <a href="https://steamid.io" target="_blank" rel="noreferrer" className="text-primary hover:underline">steamid.io</a>.
          Format: 17 digits, e.g. <code className="text-foreground">76561198000000000</code>.
        </p>
        <form onSubmit={manualSubmit} className="mt-4 flex gap-2">
          <input name="steamid" required pattern="\d{17}" placeholder="76561198000000000"
            className="flex-1 rounded-md border border-border bg-input px-3 py-2.5 outline-none text-sm focus:border-primary" />
          <button type="submit" disabled={busy} className="px-4 py-2.5 rounded-md border border-border bg-secondary/60 hover:bg-secondary text-sm font-medium">
            Save
          </button>
        </form>
        <p className="mt-3 text-xs text-warning">
          Manual entries may require admin approval before a purchase can be delivered.
        </p>
      </div>
    </div>
  );
}
