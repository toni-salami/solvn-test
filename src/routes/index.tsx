import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solvn — We help build impactful ventures" },
      { name: "description", content: "Solvn is a multi-tenant storefront platform for sellers in Nigeria and the diaspora." },
      { property: "og:title", content: "Solvn — We help build impactful ventures" },
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

          <div className="mt-10 flex flex-wrap gap-6 text-sm">
            <Link to="/marketplace" className="border-b border-foreground pb-1 text-foreground">
              Browse marketplace
            </Link>
            <Link to="/auth" className="border-b border-border pb-1 text-muted-foreground hover:text-foreground">
              Sign in or create an account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
