import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "solvn — We help build impactful ventures" },
      { name: "description", content: "solvn is a multi-tenant storefront platform for sellers in Nigeria and the diaspora." },
      { property: "og:title", content: "solvn — We help build impactful ventures" },
      { property: "og:description", content: "Storefronts for Nigerian sellers everywhere." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        <section className="border-b border-border py-16 sm:py-24">
          <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            We help build impactful ventures
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Storefronts for Nigerian sellers everywhere
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button asChild variant="outline">
              <Link to="/marketplace">Browse the marketplace</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/about">About us</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
