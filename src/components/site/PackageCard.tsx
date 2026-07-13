import { Link } from "@tanstack/react-router";
import { Clock, Crown, Heart, Zap, Check } from "lucide-react";
import { tierFromSlug, tierMeta } from "@/lib/tier";
import { imageForSlug } from "@/lib/package-images";

interface Pkg {
  id: string;
  name: string;
  slug: string;
  price_eur: number;
  duration_days: number | null;
  short_description: string | null;
  features: unknown;
}

const iconFor = (slug: string) => {
  if (slug === "queue-priority") return Clock;
  if (slug === "vip") return Crown;
  if (slug === "vip-plus") return Zap;
  return Heart;
};

export function PackageCard({ pkg }: { pkg: Pkg }) {
  const tier = tierFromSlug(pkg.slug);
  const meta = tierMeta[tier];
  const Icon = iconFor(pkg.slug);
  const features = (Array.isArray(pkg.features) ? pkg.features : []) as string[];
  const isBest = pkg.slug === "vip-plus";

  return (
    <Link
      to="/packages/$slug"
      params={{ slug: pkg.slug }}
      className="group relative flex flex-col panel overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
      style={{ borderColor: `color-mix(in oklab, ${meta.accentVar} 30%, transparent)` }}
    >
      {isBest && (
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full tier-badge-vipplus">
          Best value
        </div>
      )}

      <div
        className="relative h-48 overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 40%, color-mix(in oklab, ${meta.accentVar} 20%, transparent) 0%, oklch(0.14 0.02 250) 70%)`,
        }}
      >
        <img
          src={imageForSlug(pkg.slug)}
          alt={pkg.name}
          width={1024}
          height={1024}
          loading="lazy"
          className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div
          className="absolute -bottom-6 left-6 w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur-md border"
          style={{
            background: `color-mix(in oklab, ${meta.accentVar} 20%, oklch(0.14 0.02 250))`,
            borderColor: `color-mix(in oklab, ${meta.accentVar} 50%, transparent)`,
          }}
        >
          <Icon className="w-7 h-7" style={{ color: meta.accentVar }} />
        </div>
      </div>


      <div className="p-6 pt-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${meta.badgeClass}`}>
            {meta.label}
          </span>
          {pkg.duration_days && (
            <span className="text-xs text-muted-foreground">{pkg.duration_days} days</span>
          )}
        </div>
        <h3 className="text-xl font-bold mt-1">{pkg.name}</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{pkg.short_description}</p>

        <ul className="mt-4 space-y-1.5 flex-1">
          {features.slice(0, 3).map((f, i) => (
            <li key={i} className="flex gap-2 text-xs text-muted-foreground">
              <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: meta.accentVar }} />
              <span className="line-clamp-1">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between pt-4 border-t border-border/60">
          <div>
            <div className="text-2xl font-bold" style={{ color: meta.accentVar }}>
              €{pkg.price_eur.toFixed(0)}
              {pkg.slug === "support" && <span className="text-xs text-muted-foreground font-normal ml-1">from</span>}
            </div>
          </div>
          <div className="text-sm font-semibold text-primary group-hover:text-primary-glow transition-colors">
            View →
          </div>
        </div>
      </div>
    </Link>
  );
}
