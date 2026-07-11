import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ShieldAlert, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { fetchPackageBySlug } from "@/lib/packages";
import { tierFromSlug, tierMeta } from "@/lib/tier";
import { imageForSlug } from "@/lib/package-images";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/packages/$slug")({
  component: PackageDetail,
});

function PackageDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pkg, isLoading } = useQuery({
    queryKey: ["package", slug],
    queryFn: () => fetchPackageBySlug(slug),
  });

  if (isLoading) return <div className="container-shop py-20 text-center text-muted-foreground">Loading…</div>;
  if (!pkg) return (
    <div className="container-shop py-20 text-center">
      <h1 className="text-2xl font-bold">Package not found</h1>
      <Link to="/store" className="mt-4 inline-block text-primary">Back to store</Link>
    </div>
  );

  const tier = tierFromSlug(pkg.slug);
  const meta = tierMeta[tier];
  const features = (Array.isArray(pkg.features) ? pkg.features : []) as string[];

  const onBuy = () => {
    if (!user) {
      toast.error("Please sign in first");
      navigate({ to: "/auth", search: { redirect: `/packages/${slug}` } as any });
      return;
    }
    navigate({ to: "/checkout/$slug", params: { slug: pkg.slug } });
  };

  return (
    <div className="container-shop py-8 md:py-12">
      <Link to="/store" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> All packages
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="relative">
          <div
            className="panel overflow-hidden aspect-square ring-2"
            style={{ borderColor: `color-mix(in oklab, ${meta.accentVar} 40%, transparent)`, boxShadow: `0 20px 60px -20px color-mix(in oklab, ${meta.accentVar} 40%, transparent)` }}
          >
            <img src={imageForSlug(pkg.slug)} alt={pkg.name} width={1024} height={1024} className="w-full h-full object-cover" />
          </div>
        </div>

        <div>
          <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded ${meta.badgeClass}`}>
            {meta.label}
          </span>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold">{pkg.name}</h1>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-5xl font-bold" style={{ color: meta.accentVar }}>€{Number(pkg.price_eur).toFixed(0)}</span>
            {pkg.duration_days ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm"><Clock className="w-4 h-4" /> 30 days</span>
            ) : (
              <span className="text-muted-foreground text-sm">One-time donation</span>
            )}
          </div>

          <p className="mt-6 text-muted-foreground leading-relaxed">{pkg.description}</p>

          <div className="mt-6 panel p-5">
            <div className="text-xs font-bold tracking-widest uppercase mb-3 text-muted-foreground">Includes</div>
            <ul className="space-y-2.5">
              {features.map((f, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: meta.accentVar }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground panel p-4 border-warning/30">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
            <span>
              You must have a linked Steam account before purchase. Ranks requiring Discord roles also
              need a linked Discord account. Manage links from <Link to="/account" className="text-primary hover:underline">My Account</Link>.
            </span>
          </div>

          <button onClick={onBuy} className="btn-primary mt-6 w-full py-4 rounded-lg font-bold text-base">
            {user ? "Continue to checkout" : "Sign in to purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}
