import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_BUCKET = "product-images";

export async function signProductImage(path: string, expiresIn = 60 * 60): Promise<string | null> {
  if (!path) return null;
  // If it's already a full URL, return as-is
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from(PRODUCT_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function signProductImages(paths: string[]): Promise<string[]> {
  const urls = await Promise.all(paths.map((p) => signProductImage(p)));
  return urls.filter((u): u is string => !!u);
}

export function formatNaira(n: number): string {
  if (!Number.isFinite(n)) return "₦0";
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}
