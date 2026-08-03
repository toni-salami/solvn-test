import { supabase } from "@/integrations/supabase/client";
import type { ShippingAddress } from "@/components/buyer/AddressForm";

export const ADDRESS_SELECT_COLUMNS =
  "id, buyer_id, label, recipient_name, recipient_phone, address_line, city, state, country, is_default";

export async function loadBuyerAddresses(): Promise<{
  buyerId: string;
  addresses: ShippingAddress[];
}> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in");

  const { data: buyer, error: buyerError } = await supabase
    .from("buyers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (buyerError) throw new Error(buyerError.message);
  if (!buyer) throw new Error("Buyer profile not found");

  const { data, error } = await supabase
    .from("shipping_addresses")
    .select(ADDRESS_SELECT_COLUMNS)
    .eq("buyer_id", buyer.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return { buyerId: buyer.id as string, addresses: (data ?? []) as ShippingAddress[] };
}
