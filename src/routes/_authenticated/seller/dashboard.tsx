import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, Package, ShieldCheck, ShoppingBag, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Seller dashboard · solvn" },
      { name: "description", content: "Manage your solvn storefront, products, and orders." },
      { property: "og:title", content: "Seller dashboard · solvn" },
      { property: "og:description", content: "Manage your solvn storefront." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellerDashboard,
});

const cards = [
  { to: "/seller/storefront", title: "Storefront", desc: "Branding, slug, and visibility.", icon: Store },
  { to: "/seller/products", title: "Products", desc: "List, edit, and manage inventory.", icon: Package },
  { to: "/seller/verification", title: "Verification", desc: "Submit business documents.", icon: ShieldCheck },
  { to: "/seller/orders", title: "Orders", desc: "Coming soon.", icon: ShoppingBag },
  { to: "/seller/settings", title: "Settings", desc: "Coming soon.", icon: Settings },
] as const;

function SellerDashboard() {
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jump into any section to keep your store running.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <c.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
              <div className="mt-3 text-sm font-medium">{c.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
