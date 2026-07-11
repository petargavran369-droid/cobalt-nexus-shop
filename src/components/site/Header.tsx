import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Shield, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import logo from "@/assets/cobalt-logo.png.asset.json";

const nav = [
  { to: "/", label: "Home" },
  { to: "/store", label: "Store" },
  { to: "/support", label: "Support" },
  { to: "/terms", label: "Terms" },
];

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-shop flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logo.url} alt="Cobalt Rust EU" width={36} height={36} className="rounded-md" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-widest text-gradient-cobalt uppercase">Cobalt</span>
            <span className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase">Rust EU</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-foreground bg-secondary/60" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="px-3 py-2 text-sm rounded-md transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md text-tier-vip hover:bg-secondary/60">
                  <Shield className="w-4 h-4" /> Admin
                </Link>
              )}
              <Link to="/account" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md hover:bg-secondary/60">
                <UserIcon className="w-4 h-4" /> Account
              </Link>
              <button onClick={signOut} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-primary inline-flex items-center px-4 py-2 text-sm rounded-md font-medium">
              Sign in
            </Link>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2" aria-label="Menu">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95">
          <div className="container-shop py-3 flex flex-col gap-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60">
                {n.label}
              </Link>
            ))}
            <div className="border-t border-border/60 my-2" />
            {user ? (
              <>
                {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm rounded-md text-tier-vip">Admin</Link>}
                <Link to="/account" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm rounded-md">My Account</Link>
                <button onClick={() => { signOut(); setOpen(false); }} className="text-left px-3 py-2.5 text-sm rounded-md text-muted-foreground">Sign out</button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm rounded-md btn-primary text-center">Sign in</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
