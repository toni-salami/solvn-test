import { useEffect, useState } from "react";
import { signProductImage } from "@/lib/product-images";

/** Signs a list of storage paths and returns a path -> signed URL map. */
export function useSignedImages(paths: Array<string | null>) {
  const key = paths.join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const unique = [...new Set(key.split("|").filter(Boolean))];
      const entries = await Promise.all(
        unique.map(async (p) => [p, await signProductImage(p)] as const),
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [p, url] of entries) if (url) next[p] = url;
      setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);
  return urls;
}
