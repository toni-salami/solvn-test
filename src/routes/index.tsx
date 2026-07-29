import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solvn — Storefronts for Nigerian sellers" },
      { name: "description", content: "Solvn is a multi-tenant storefront platform for sellers in Nigeria and the diaspora." },
      { property: "og:title", content: "Solvn — Storefronts for Nigerian sellers" },
      { property: "og:description", content: "Multi-tenant storefronts for sellers in Nigeria and the diaspora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Solvn</h1>
        <p className="mt-3 text-muted-foreground">
          Storefronts for Nigerian sellers — at home and in the diaspora.
        </p>
        <div className="mt-6">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Sign in or create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
