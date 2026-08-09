import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seller/orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Orders · solvn seller" },
      { name: "description", content: "View and fulfill customer orders." },
      { property: "og:title", content: "Orders · solvn seller" },
      { property: "og:description", content: "View and fulfill customer orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersComingSoon,
});

function OrdersComingSoon() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl rounded-lg border border-dashed p-10 text-center">
        <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Orders — coming soon</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Buyer checkout and order fulfillment tools land in the next phase. You'll manage
          incoming orders, delivery tracking, and payouts here.
        </p>
      </div>
    </div>
  );
}
