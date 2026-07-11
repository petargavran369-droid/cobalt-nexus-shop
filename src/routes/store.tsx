import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPackages } from "@/lib/packages";
import { PackageCard } from "@/components/site/PackageCard";

export const Route = createFileRoute("/store")({
  head: () => ({ meta: [
    { title: "Store — Cobalt Rust EU" },
    { name: "description", content: "All Cobalt Rust EU packages: Queue Priority, VIP, VIP+ and community support. Cosmetic & QoL only." },
    { property: "og:title", content: "Store — Cobalt Rust EU" },
    { property: "og:description", content: "All Cobalt Rust EU packages: Queue Priority, VIP, VIP+ and community support." },
  ]}),
  component: Store,
});

function Store() {
  const { data: packages = [], isLoading } = useQuery({ queryKey: ["packages"], queryFn: fetchPackages });

  return (
    <div className="container-shop py-12 md:py-16">
      <div className="max-w-2xl">
        <div className="text-xs font-bold tracking-widest uppercase text-primary-glow mb-2">The Store</div>
        <h1 className="text-4xl md:text-5xl font-bold">All packages</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          30-day cosmetic and quality-of-life perks. Every package auto-delivers your Rust server rank
          and Discord role after payment. Everything expires cleanly after 30 days.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel h-96 animate-pulse" />
        ))}
        {packages.map((p) => <PackageCard key={p.id} pkg={p as any} />)}
      </div>
    </div>
  );
}
