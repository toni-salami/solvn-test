import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type ShippingAddress = {
  id: string;
  buyer_id: string;
  label: string | null;
  recipient_name: string;
  recipient_phone: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  is_default: boolean;
};

export type AddressFormValues = {
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  is_default: boolean;
};

export function emptyAddressValues(): AddressFormValues {
  return {
    label: "",
    recipient_name: "",
    recipient_phone: "",
    address_line: "",
    city: "",
    state: "",
    country: "Nigeria",
    is_default: false,
  };
}

export function toFormValues(address: ShippingAddress): AddressFormValues {
  return {
    label: address.label ?? "",
    recipient_name: address.recipient_name,
    recipient_phone: address.recipient_phone,
    address_line: address.address_line,
    city: address.city,
    state: address.state,
    country: address.country || "Nigeria",
    is_default: address.is_default,
  };
}

export function formatAddressLine(address: ShippingAddress): string {
  return [address.address_line, address.city, address.state, address.country]
    .filter(Boolean)
    .join(", ");
}

type Props = {
  initialValues: AddressFormValues;
  submitLabel: string;
  saving: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: AddressFormValues) => void;
};

export function AddressForm({
  initialValues,
  submitLabel,
  saving,
  error,
  onCancel,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<AddressFormValues>(initialValues);
  const [touched, setTouched] = useState(false);

  function set<K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const missingRequired =
    !values.recipient_name.trim() ||
    !values.recipient_phone.trim() ||
    !values.address_line.trim() ||
    !values.city.trim() ||
    !values.state.trim() ||
    !values.country.trim();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (missingRequired) return;
        onSubmit({
          ...values,
          label: values.label.trim(),
          recipient_name: values.recipient_name.trim(),
          recipient_phone: values.recipient_phone.trim(),
          address_line: values.address_line.trim(),
          city: values.city.trim(),
          state: values.state.trim(),
          country: values.country.trim(),
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="label">Label (optional)</Label>
        <Input
          id="label"
          placeholder="Mum's house"
          value={values.label}
          onChange={(e) => set("label", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recipient_name">Recipient name</Label>
          <Input
            id="recipient_name"
            value={values.recipient_name}
            onChange={(e) => set("recipient_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipient_phone">Recipient phone</Label>
          <Input
            id="recipient_phone"
            inputMode="tel"
            value={values.recipient_phone}
            onChange={(e) => set("recipient_phone", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line">Address</Label>
        <Input
          id="address_line"
          placeholder="12 Adeola Odeku Street"
          value={values.address_line}
          onChange={(e) => set("address_line", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={values.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" value={values.state} onChange={(e) => set("state", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={values.country}
            onChange={(e) => set("country", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Default address</p>
          <p className="text-xs text-muted-foreground">Used first at checkout.</p>
        </div>
        <Switch
          checked={values.is_default}
          onCheckedChange={(checked) => set("is_default", checked)}
          aria-label="Set as default address"
        />
      </div>

      {touched && missingRequired ? (
        <p className="text-sm text-destructive">Please fill in all required fields.</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
