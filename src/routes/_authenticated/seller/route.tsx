import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";

export const Route = createFileRoute("/_authenticated/seller")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const role = await fetchUserRole(data.user.id);
    if (role === "buyer") throw redirect({ to: "/buyer/home" });
    if (role !== "seller") throw redirect({ to: "/auth" });
  },
  component: SellerLayout,
});

function SellerLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SellerSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-2 gap-2">
            <SidebarTrigger />
            <span className="text-sm font-medium">Seller dashboard</span>
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
