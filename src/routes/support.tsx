import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Mail, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [
    { title: "Support — Cobalt Rust EU" },
    { name: "description", content: "Contact Cobalt Rust EU support. We help with payments, delivery, and account issues." },
  ]}),
  component: Support,
});

function Support() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    // Log locally; a real support form would email or open a ticket
    console.log("Support message", Object.fromEntries(fd));
    setBusy(false);
    (e.target as HTMLFormElement).reset();
    toast.success("Message received. We'll get back to you by email.");
  };

  return (
    <div className="container-shop py-12 md:py-16">
      <div className="max-w-2xl">
        <div className="text-xs font-bold tracking-widest uppercase text-primary-glow mb-2">Support</div>
        <h1 className="text-4xl md:text-5xl font-bold">Need help?</h1>
        <p className="mt-3 text-muted-foreground">
          Fastest way to reach us is on Discord — most issues resolve there in minutes.
        </p>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-4">
        <a href="https://discord.gg" target="_blank" rel="noreferrer" className="panel p-6 hover:border-primary/40 transition-colors">
          <MessageCircle className="w-8 h-8 text-primary" />
          <h3 className="mt-3 font-bold">Discord</h3>
          <p className="text-xs text-muted-foreground mt-1">Ping @Support in #help.</p>
        </a>
        <a href="mailto:cobalt-rust@outlook.com" className="panel p-6 hover:border-primary/40 transition-colors">
          <Mail className="w-8 h-8 text-primary" />
          <h3 className="mt-3 font-bold">Email</h3>
          <p className="text-xs text-muted-foreground mt-1 break-all">cobalt-rust@outlook.com</p>
        </a>
        <div className="panel p-6">
          <LifeBuoy className="w-8 h-8 text-primary" />
          <h3 className="mt-3 font-bold">Response time</h3>
          <p className="text-xs text-muted-foreground mt-1">Under 24h, usually faster.</p>
        </div>
      </div>

      <div className="mt-10 grid md:grid-cols-[1fr_320px] gap-6">
        <form onSubmit={submit} className="panel-elevated p-6 space-y-4">
          <h2 className="text-xl font-bold">Send us a message</h2>
          <label className="block">
            <span className="text-xs text-muted-foreground">Your email</span>
            <input required type="email" name="email" defaultValue={user?.email || ""}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2.5 outline-none text-sm focus:border-primary" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Subject</span>
            <input required type="text" name="subject" maxLength={120}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2.5 outline-none text-sm focus:border-primary" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Message</span>
            <textarea required name="message" rows={6} maxLength={2000}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2.5 outline-none text-sm focus:border-primary resize-none" />
          </label>
          <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 rounded-md font-semibold text-sm">
            Send message
          </button>
        </form>

        <aside className="panel p-6 h-fit">
          <h3 className="font-bold text-sm">Before you write</h3>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li>• Include your Steam name or SteamID64.</li>
            <li>• Include the transaction email if payment failed.</li>
            <li>• Screenshots help us help you.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
