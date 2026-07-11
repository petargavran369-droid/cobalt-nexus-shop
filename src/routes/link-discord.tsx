import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/link-discord")({
  head: () => ({ meta: [{ title: "Link Discord — Cobalt Rust EU" }] }),
  component: LinkDiscord,
});

function LinkDiscord() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="container-shop py-16 text-center text-muted-foreground">Loading…</div>;
  if (!user) throw redirect({ to: "/auth", search: { redirect: "/link-discord" } as any });

  const signInWithDiscord = () => {
    setBusy(true);
    window.location.href = `/api/public/discord/initiate?uid=${user.id}`;
  };

  const manualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = String(fd.get("discord_id") ?? "").trim();
    const name = String(fd.get("discord_username") ?? "").trim();
    if (!/^\d{17,20}$/.test(id)) { toast.error("Discord user ID must be 17-20 digits"); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ discord_id: id, discord_username: name || null }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Discord saved");
    window.location.href = "/account?linked=discord";
  };

  return (
    <div className="container-shop py-8 md:py-12 max-w-2xl">
      <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Account
      </Link>

      <h1 className="text-3xl md:text-4xl font-bold">Link Discord</h1>
      <p className="mt-2 text-muted-foreground">
        Required for packages that grant Discord roles (VIP, VIP+, Queue Priority, Supporter).
      </p>

      <div className="mt-8 panel-elevated p-6">
        <div className="text-xs font-bold tracking-widest uppercase text-primary-glow mb-3">Recommended</div>
        <h2 className="text-xl font-bold">Sign in with Discord</h2>
        <p className="text-sm text-muted-foreground mt-1">Uses Discord's OAuth2 flow.</p>
        <button onClick={signInWithDiscord} disabled={busy}
          className="mt-4 px-5 py-3 rounded-md font-semibold inline-flex items-center gap-2"
          style={{ background: "#5865F2", color: "white" }}>
          Sign in with Discord <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-6 panel p-6">
        <h2 className="text-lg font-bold">Or paste your Discord user ID</h2>
        <p className="text-xs text-muted-foreground mt-1">
          In Discord, enable Developer Mode, right-click your profile and select "Copy User ID".
        </p>
        <form onSubmit={manualSubmit} className="mt-4 space-y-3">
          <input name="discord_id" required placeholder="Discord user ID (17-20 digits)"
            className="w-full rounded-md border border-border bg-input px-3 py-2.5 outline-none text-sm focus:border-primary" />
          <input name="discord_username" placeholder="Discord username (optional)"
            className="w-full rounded-md border border-border bg-input px-3 py-2.5 outline-none text-sm focus:border-primary" />
          <button type="submit" disabled={busy} className="px-4 py-2.5 rounded-md border border-border bg-secondary/60 hover:bg-secondary text-sm font-medium">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
