import { supabase } from "@/integrations/supabase/client";

export type UserRole = "seller" | "buyer" | null;

export async function fetchUserRole(userId: string): Promise<UserRole> {
  const [{ data: seller }, { data: buyer }] = await Promise.all([
    supabase.from("sellers").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("buyers").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  if (seller) return "seller";
  if (buyer) return "buyer";
  return null;
}

export function homePathForRole(role: UserRole): string {
  if (role === "seller") return "/seller/dashboard";
  if (role === "buyer") return "/buyer/home";
  return "/auth";
}
