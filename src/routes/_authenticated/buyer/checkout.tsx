import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, MapPin, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";
import { useCart } from "@/lib/cart";
import { loadBuyerAddresses } from "@/lib/buyer-addresses";
import { formatNaira } from "@/lib/product-images";
import { useSignedImages } from "@/lib/use-signed-images";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AddressForm,
  emptyAddressValues,
  formatAddressLine,
  type AddressFormValues,
  type ShippingAddress,
} from "@/components/buyer/AddressForm";

export const Route = createFileRoute("/_authenticated/buyer/checkout")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Checkout · solvn" },
      {
        name: "description",
        content: "Choose a delivery address and review your solvn order summary before payment.",
      },
      { property: "og:title", content: "Checkout · solvn" },
      {
        property: "og:description",
        content: "Choose a delivery address and review your solvn order summary before payment.",
      },
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
  component: CheckoutPage,
});

type Step = "address" | "summary";

function CheckoutPage() {
  const queryClient = useQueryClient();
  const { groups, items, total, count } = useCart();
  const [step, setStep] = useState<Step>("address");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const imageUrls = useSignedImages(items.map((i) => i.imagePath));

  const addressesQuery = useQuery({
    queryKey: ["buyer-addresses"],
    queryFn: loadBuyerAddresses,
  });

  const buyerId = addressesQuery.data?.buyerId;
  const addresses = addressesQuery.data?.addresses ?? [];

  useEffect(() => {
    if (selectedId || addresses.length === 0) return;
    setSelectedId((addresses.find((a) => a.is_default) ?? addresses[0]).id);
  }, [addresses, selectedId]);

  const selected: ShippingAddress | null =
    addresses.find((a) => a.id === selectedId) ?? null;

  const addMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      if (!buyerId) throw new Error("Buyer profile not found");
      if (values.is_default) {
        const { error: clearError } = await supabase
          .from("shipping_addresses")
          .update({ is_default: false })
          .eq("buyer_id", buyerId)
          .eq("is_default", true);
        if (clearError) throw new Error(clearError.message);
      }
      const { data, error } = await supabase
        .from("shipping_addresses")
        .insert({
          buyer_id: buyerId,
          label: values.label ? values.label : null,
          recipient_name: values.recipient_name,
          recipient_phone: values.recipient_phone,
          address_line: values.address_line,
          city: values.city,
          state: values.state,
          country: values.country,
          is_default: values.is_default,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: async (id) => {
      setDialogOpen(false);
      setSelectedId(id);
      await queryClient.invalidateQueries({ queryKey: ["buyer-addresses"] });
    },
  });

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6 sm:p-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-dashed p-10 text-center">
          <h1 className="text-lg font-semibold">Your cart is empty</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a product before heading to checkout.
          </p>
          <Button className="mt-5" asChild>
            <Link to="/marketplace">Browse marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Checkout</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Step {step === "address" ? "1" : "2"} of 2 ·{" "}
              {step === "address" ? "Shipping address" : "Order summary"}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/buyer/cart">Back to cart</Link>
          </Button>
        </div>

        {step === "address" ? (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium">Where should this go?</h2>
              <Button
                variant="outline"
                onClick={() => {
                  addMutation.reset();
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add new address
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              You can ship to someone else — just use their name and phone number.
            </p>

            {addressesQuery.isPending ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading addresses…</p>
            ) : addressesQuery.isError ? (
              <p className="mt-6 text-sm text-destructive">
                {(addressesQuery.error as Error).message}
              </p>
            ) : addresses.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed p-10 text-center">
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-4 text-sm font-medium">You haven't saved any addresses yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a delivery address to continue.
                </p>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {addresses.map((address) => {
                  const active = address.id === selectedId;
                  return (
                    <li key={address.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(address.id)}
                        aria-pressed={active}
                        className={`flex w-full items-start justify-between gap-3 rounded-lg border p-4 text-left ${
                          active ? "border-primary ring-1 ring-primary" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {address.label || address.recipient_name}
                            </p>
                            {address.is_default ? (
                              <Badge variant="secondary">Default</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {address.recipient_name} · {address.recipient_phone}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatAddressLine(address)}
                          </p>
                        </div>
                        {active ? <Check className="h-5 w-5 shrink-0 text-primary" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-8 flex justify-end">
              <Button disabled={!selected} onClick={() => setStep("summary")}>
                Continue to order summary
              </Button>
            </div>
          </section>
        ) : (
          <section className="mt-8">
            <div className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Shipping to
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setStep("address")}>
                  Change
                </Button>
              </div>
              {selected ? (
                <div className="mt-2">
                  <p className="font-medium">{selected.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{selected.recipient_phone}</p>
                  <p className="text-sm text-muted-foreground">{formatAddressLine(selected)}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 space-y-6">
              {groups.map((group) => (
                <section key={group.sellerId} className="rounded-lg border">
                  <header className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{group.businessName}</p>
                      <p className="text-xs text-muted-foreground">
                        Ships as a separate order from this seller
                      </p>
                    </div>
                    <span className="text-sm font-medium">{formatNaira(group.subtotal)}</span>
                  </header>
                  <ul className="divide-y">
                    {group.items.map((item) => (
                      <li key={item.productId} className="flex items-center gap-3 p-4">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {item.imagePath && imageUrls[item.imagePath] ? (
                            <img
                              src={imageUrls[item.imagePath]}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × {formatNaira(item.priceNgn)}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {formatNaira(item.priceNgn * item.quantity)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-8 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {count} item{count === 1 ? "" : "s"} · {groups.length} seller
                  {groups.length === 1 ? "" : "s"}
                </p>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Order total</p>
                  <p className="text-xl font-semibold">{formatNaira(total)}</p>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" disabled title="Payments launching soon">
                  Continue to Payment — payments launching soon
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Nothing has been ordered or charged. Payments go live in a later release.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add address</DialogTitle>
          </DialogHeader>
          <AddressForm
            initialValues={{ ...emptyAddressValues(), is_default: addresses.length === 0 }}
            submitLabel="Save and use"
            saving={addMutation.isPending}
            error={addMutation.isError ? (addMutation.error as Error).message : null}
            onCancel={() => setDialogOpen(false)}
            onSubmit={(values) => addMutation.mutate(values)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
