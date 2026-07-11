import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shield, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { fetchPackages } from "@/lib/packages";
import { PackageCard } from "@/components/site/PackageCard";
import heroBg from "@/assets/hero-bg.jpg";
import logo from "@/assets/cobalt-logo.png.asset.json";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data: packages = [] } = useQuery({ queryKey: ["packages"], queryFn: fetchPackages });

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroBg} alt="" width={1920} height={1080} className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="container-shop py-24 md:py-32 relative">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <img src={logo.url} width={100} height={100} alt="" className="mb-6 drop-shadow-[0_0_30px_oklch(0.62_0.20_255/0.5)]" />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary-glow tracking-wider uppercase mb-6">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Server online · EU
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="text-gradient-cobalt">Cobalt Rust EU</span>
              <br />
              <span className="text-foreground">Premium Ranks & Perks</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Cosmetic and quality-of-life packages for the Cobalt Rust EU community.
              Skip the queue, unlock SkinBox, support the server — <span className="text-foreground font-medium">never pay-to-win</span>.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/store" className="btn-primary px-6 py-3 rounded-md font-semibold inline-flex items-center gap-2">
                Browse packages <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/terms" className="px-6 py-3 rounded-md border border-border hover:bg-secondary/60 font-medium">
                Read our promise
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="container-shop -mt-8 relative z-10">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: "Never pay-to-win", desc: "No kits, no gather boosts, no combat advantages. Ever." },
            { icon: ShieldCheck, title: "Secure payments", desc: "Stripe-powered checkout. Full refund policy." },
            { icon: Zap, title: "Instant delivery", desc: "Ranks and Discord roles applied automatically." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="panel p-5 flex gap-4">
              <div className="w-11 h-11 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary-glow" />
              </div>
              <div>
                <div className="font-semibold text-sm">{title}</div>
                <div className="text-xs text-muted-foreground mt-1">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PACKAGES */}
      <section className="container-shop py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-primary-glow mb-2">The Store</div>
            <h2 className="text-3xl md:text-4xl font-bold">Choose your rank</h2>
          </div>
          <Link to="/store" className="hidden md:inline text-sm text-primary hover:text-primary-glow">View all →</Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((p) => <PackageCard key={p.id} pkg={p as any} />)}
        </div>
      </section>

      {/* PROMISE */}
      <section className="container-shop pb-20">
        <div className="panel-elevated p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-40" style={{ background: "var(--gradient-glow)" }} />
          <div className="max-w-3xl">
            <div className="text-xs font-bold tracking-widest uppercase text-primary-glow mb-3">Our Promise</div>
            <h3 className="text-2xl md:text-3xl font-bold">Fair play stays fair.</h3>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Everything we sell is either cosmetic (SkinBox, TeamSkinBox, chat prefixes) or quality-of-life
              (Queue Priority, event alerts also posted publicly on Discord). No damage boosts, no free loot,
              no raid advantages. Abuse or chargeback fraud results in permanent removal of VIP access.
            </p>
            <Link to="/terms" className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-glow">
              Read the full terms <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
