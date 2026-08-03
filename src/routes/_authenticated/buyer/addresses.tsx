import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";
import { loadBuyerAddresses } from "@/lib/buyer-addresses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AddressForm,
  emptyAddressValues,
  formatAddressLine,
  toFormValues,
  type AddressFormValues,
  type ShippingAddress,
} from "@/components/buyer/AddressForm";

export const Route = createFileRoute("/_authenticated/buyer/addresses")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Saved addresses · Solvn" },
      {
        name: "description",
        content: "Manage the delivery addresses saved to your Solvn buyer account.",
      },
      { property: "og:title", content: "Saved addresses · Solvn" },
      {
        property: "og:description",
        content: "Manage the delivery addresses saved to your Solvn buyer account.",
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
  component: BuyerAddresses,
});

function BuyerAddresses() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingAddress | null>(null);

  const addressesQuery = useQuery({
    queryKey: ["buyer-addresses"],
    queryFn: loadBuyerAddresses,
  });

  const buyerId = addressesQuery.data?.buyerId;
  const addresses = addressesQuery.data?.addresses ?? [];

  const saveMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      if (!buyerId) throw new Error("Buyer profile not found");

      const payload = {
        buyer_id: buyerId,
        label: values.label ? values.label : null,
        recipient_name: values.recipient_name,
        recipient_phone: values.recipient_phone,
        address_line: values.address_line,
        city: values.city,
        state: values.state,
        country: values.country,
        is_default: values.is_default,
      };

      // Only one default per buyer: clear the others first.
      if (values.is_default) {
        let clear = supabase
          .from("shipping_addresses")
          .update({ is_default: false })
          .eq("buyer_id", buyerId)
          .eq("is_default", true);
        if (editing) clear = clear.neq("id", editing.id);
        const { error: clearError } = await clear;
        if (clearError) throw new Error(clearError.message);
      }

      if (editing) {
        const { error } = await supabase
          .from("shipping_addresses")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("shipping_addresses").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["buyer-addresses"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_addresses").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["buyer-addresses"] });
    },
  });

  function openCreate() {
    setEditing(null);
    saveMutation.reset();
    setDialogOpen(true);
  }

  function openEdit(address: ShippingAddress) {
    setEditing(address);
    saveMutation.reset();
    setDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Saved addresses</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Delivery addresses on your account.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/buyer/home">Back</Link>
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add address
            </Button>
          </div>
        </div>

        {addressesQuery.isPending ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading addresses…</p>
        ) : addressesQuery.isError ? (
          <p className="mt-8 text-sm text-destructive">
            {(addressesQuery.error as Error).message}
          </p>
        ) : addresses.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed p-10 text-center">
            <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">You haven't saved any addresses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add one now to speed up checkout later.
            </p>
            <Button className="mt-5" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add address
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {addresses.map((address) => (
              <li
                key={address.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{address.label || address.recipient_name}</p>
                    {address.is_default ? <Badge variant="secondary">Default</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {address.recipient_name} · {address.recipient_phone}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatAddressLine(address)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(address)}
                    aria-label={`Edit ${address.label || address.recipient_name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(address.id)}
                    aria-label={`Delete ${address.label || address.recipient_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {deleteMutation.isError ? (
          <p className="mt-3 text-sm text-destructive">
            {(deleteMutation.error as Error).message}
          </p>
        ) : null}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit address" : "Add address"}</DialogTitle>
          </DialogHeader>
          <AddressForm
            key={editing?.id ?? "new"}
            initialValues={
              editing
                ? toFormValues(editing)
                : { ...emptyAddressValues(), is_default: addresses.length === 0 }
            }
            submitLabel={editing ? "Save changes" : "Add address"}
            saving={saveMutation.isPending}
            error={saveMutation.isError ? (saveMutation.error as Error).message : null}
            onCancel={() => setDialogOpen(false)}
            onSubmit={(values) => saveMutation.mutate(values)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
