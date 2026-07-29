import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";

export const Route = createFileRoute("/_authenticated/buyer/home")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Marketplace · Solvn" },
      { name: "description", content: "Browse Solvn storefronts and products." },
      { property: "og:title", content: "Marketplace · Solvn" },
      { property: "og:description", content: "Browse Solvn storefronts and products." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const role = await fetchUserRole(data.user.id);
    if (role === "seller") throw redirect({ to: "/seller/dashboard" });
    if (role !== "buyer") throw redirect({ to: "/auth" });
  },
  component: BuyerHome,
});

function BuyerHome() {
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
          <h1 className="text-2xl font-semibold">Marketplace</h1>
          <button onClick={signOut} className="rounded-md border px-3 py-1.5 text-sm">Sign out</button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder — Phase 2 will build this out.
        </p>
      </div>
    </div>
  );
}
