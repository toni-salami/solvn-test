import { createFileRoute, redirect, Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";
import { ProductForm } from "@/components/seller/ProductForm";

export const Route = createFileRoute("/_authenticated/seller/products/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Edit product · solvn" },
      { name: "description", content: "Edit a product in your solvn storefront." },
      { property: "og:title", content: "Edit product · solvn" },
      { property: "og:description", content: "Edit a product." },
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
  component: EditProduct,
});

function EditProduct() {
  const { id } = useParams({ from: "/_authenticated/seller/products/$id" });
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Edit product</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Update details, images, and status.
            </p>
          </div>
          <Link to="/seller/products" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Back
          </Link>
        </div>
        <ProductForm productId={id} />
      </div>
    </div>
  );
}
