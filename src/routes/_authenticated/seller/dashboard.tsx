import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";

export const Route = createFileRoute("/_authenticated/seller/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Seller dashboard · Solvn" },
      { name: "description", content: "Manage your Solvn storefront, products, and orders." },
      { property: "og:title", content: "Seller dashboard · Solvn" },
      { property: "og:description", content: "Manage your Solvn storefront." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const role = await fetchUserRole(data.user.id);
    if (role === "buyer") throw redirect({ to: "/buyer/home" });
    if (role !== "seller") throw redirect({ to: "/auth" });
  },
  component: SellerDashboard,
});

function SellerDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Seller dashboard</h1>
          <button onClick={signOut} className="rounded-md border px-3 py-1.5 text-sm">Sign out</button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder — Prompt 1.4 will build this out.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/seller/storefront"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Set up storefront
          </Link>
          <Link
            to="/seller/products"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Manage products
          </Link>
        </div>
      </div>
    </div>
  );
}
