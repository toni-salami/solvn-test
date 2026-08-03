import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartButton({ className = "" }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link
      to="/buyer/cart"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className={`relative inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium ${className}`}
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="hidden sm:inline">Cart</span>
      {count > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
