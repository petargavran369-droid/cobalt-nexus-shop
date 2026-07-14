import { Link } from "@tanstack/react-router";
const logo = { url: "/logo.png" };

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-surface/50">
      <div className="container-shop py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <img src={logo.url} alt="Cobalt" width={32} height={32} className="rounded" />
            <span className="text-sm font-bold tracking-widest uppercase text-gradient-cobalt">Cobalt Rust EU</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            Rust Cobalt EU is an unofficial community server and is not affiliated with Facepunch Studios.
            All VIP perks are cosmetic or quality-of-life only. We do not sell kits, gather boosts, damage
            advantages, recoil advantages, raid advantages or any pay-to-win features.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-foreground">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/store" className="hover:text-foreground">All Packages</Link></li>
            <li><Link to="/packages/$slug" params={{ slug: "queue-priority" }} className="hover:text-foreground">Queue Priority</Link></li>
            <li><Link to="/packages/$slug" params={{ slug: "vip" }} className="hover:text-foreground">VIP</Link></li>
            <li><Link to="/packages/$slug" params={{ slug: "vip-plus" }} className="hover:text-foreground">VIP+</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-foreground">Info</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/terms" className="hover:text-foreground">Terms & Refunds</Link></li>
            <li><Link to="/support" className="hover:text-foreground">Support</Link></li>
            <li><Link to="/account" className="hover:text-foreground">My Purchases</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-shop py-4 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Cobalt Rust EU. All rights reserved.</p>
          <p>Abuse or chargeback fraud may result in removal of VIP access.</p>
        </div>
      </div>
    </footer>
  );
}
