import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart";

type Props = {
  item: Omit<CartItem, "quantity">;
  className?: string;
  disabled?: boolean;
};

export function AddToCartButton({ item, className, disabled }: Props) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = items.some((i) => i.productId === item.productId);

  return (
    <Button
      type="button"
      size="sm"
      variant={inCart ? "outline" : "default"}
      className={className}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem(item);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
    >
      {added ? "Added" : inCart ? "Add another" : "Add to cart"}
    </Button>
  );
}
