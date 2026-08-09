import { Link } from "@tanstack/react-router";

const navLinks = [
  { to: "/marketplace", label: "Marketplace" },
  { to: "/about", label: "About" },
  { to: "/auth", label: "Sign in" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link to="/" className="font-serif text-lg font-semibold tracking-tight">
          solvn
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
