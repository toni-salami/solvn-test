import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";
import { ProductForm } from "@/components/seller/ProductForm";

export const Route = createFileRoute("/_authenticated/seller/products/new")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "New product · solvn" },
      { name: "description", content: "Add a new product to your solvn storefront." },
      { property: "og:title", content: "New product · solvn" },
      { property: "og:description", content: "Add a new product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const role = await fetchUserRole(data.user.id);
    if (role !== "seller") throw redirect({ to: "/auth" });
  },
  component: NewProduct,
});

function NewProduct() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">New product</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a product to your catalog. Prices are in Nigerian Naira (₦).
            </p>
          </div>
          <Link to="/seller/products" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Back
          </Link>
        </div>
        <ProductForm />
      </div>
    </div>
  );
}
