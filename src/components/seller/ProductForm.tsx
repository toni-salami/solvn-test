import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_BUCKET, signProductImage } from "@/lib/product-images";

type Status = "draft" | "active" | "archived";

type Props = {
  productId?: string; // omit for create
};

type ImageItem = { path: string; url: string };

export function ProductForm({ productId }: Props) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceInput, setPriceInput] = useState(""); // raw digits/decimal
  const [stockInput, setStockInput] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [images, setImages] = useState<ImageItem[]>([]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<{ price?: string; stock?: string; title?: string; general?: string }>({});

  useEffect(() => {
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      if (!seller) {
        setErrors({ general: "Could not load your seller profile." });
        setLoading(false);
        return;
      }
      setSellerId(seller.id);

      if (productId) {
        const { data: p, error: pErr } = await supabase
          .from("products")
          .select("title, description, price_ngn, stock_quantity, status, images, seller_id")
          .eq("id", productId)
          .maybeSingle();
        if (pErr || !p) {
          setErrors({ general: "Product not found." });
          setLoading(false);
          return;
        }
        if (p.seller_id !== seller.id) {
          setErrors({ general: "You do not have access to this product." });
          setLoading(false);
          return;
        }
        setTitle(p.title);
        setDescription(p.description ?? "");
        setPriceInput(String(p.price_ngn ?? ""));
        setStockInput(String(p.stock_quantity ?? ""));
        setStatus((p.status as Status) ?? "draft");
        const paths = (p.images ?? []) as string[];
        const signed = await Promise.all(
          paths.map(async (path) => ({ path, url: (await signProductImage(path)) ?? "" })),
        );
        setImages(signed.filter((i) => i.url));
      }
      setLoading(false);
    })();
  }, [productId]);

  function formatPriceDisplay(raw: string): string {
    if (!raw) return "";
    const [intPart, decPart] = raw.split(".");
    const intFmt = intPart ? Number(intPart).toLocaleString("en-NG") : "0";
    return decPart !== undefined ? `${intFmt}.${decPart}` : intFmt;
  }

  function onPriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip everything except digits and a single decimal point
    const cleaned = e.target.value.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const normalized =
      parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}` : parts[0];
    setPriceInput(normalized);
    setErrors((prev) => ({ ...prev, price: undefined }));
  }

  function onStockChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(/[^\d]/g, "");
    setStockInput(cleaned);
    setErrors((prev) => ({ ...prev, stock: undefined }));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !sellerId) return;
    setErrors((prev) => ({ ...prev, general: undefined }));
    setUploading(true);
    try {
      const added: ImageItem[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setErrors((prev) => ({ ...prev, general: "Only image files are allowed." }));
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setErrors((prev) => ({ ...prev, general: "Each image must be under 5 MB." }));
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
        const path = `${sellerId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(PRODUCT_BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) {
          setErrors((prev) => ({ ...prev, general: upErr.message }));
          continue;
        }
        const url = (await signProductImage(path)) ?? "";
        if (url) added.push({ path, url });
      }
      setImages((prev) => [...prev, ...added]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeImage(path: string) {
    setImages((prev) => prev.filter((i) => i.path !== path));
    await supabase.storage.from(PRODUCT_BUCKET).remove([path]);
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Title is required.";
    const price = Number(priceInput);
    if (priceInput === "" || Number.isNaN(price)) next.price = "Price is required.";
    else if (price < 0) next.price = "Price cannot be negative.";
    const stock = Number(stockInput);
    if (stockInput === "" || Number.isNaN(stock)) next.stock = "Stock is required.";
    else if (!Number.isInteger(stock) || stock < 0) next.stock = "Stock must be a non-negative whole number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sellerId) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        seller_id: sellerId,
        title: title.trim(),
        description: description.trim() || null,
        price_ngn: Number(priceInput),
        stock_quantity: Number(stockInput),
        status,
        images: images.map((i) => i.path),
      };
      if (productId) {
        const { error: upErr } = await supabase
          .from("products")
          .update(payload)
          .eq("id", productId);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("products").insert(payload);
        if (insErr) throw insErr;
      }
      navigate({ to: "/seller/products" });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Could not save product." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!productId) return;
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      // Remove images first (best-effort)
      if (images.length) {
        await supabase.storage.from(PRODUCT_BUCKET).remove(images.map((i) => i.path));
      }
      const { error: delErr } = await supabase.from("products").delete().eq("id", productId);
      if (delErr) throw delErr;
      navigate({ to: "/seller/products" });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Could not delete product." });
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {errors.general && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errors.general}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          maxLength={120}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          aria-invalid={!!errors.title}
        />
        {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className="block text-sm font-medium">Price</label>
          <div className="mt-1 flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
            <span className="px-3 py-2 text-sm text-muted-foreground">₦</span>
            <input
              id="price"
              type="text"
              inputMode="decimal"
              value={formatPriceDisplay(priceInput)}
              onChange={onPriceChange}
              placeholder="0"
              className="w-full bg-transparent py-2 pr-3 text-sm outline-none"
              aria-invalid={!!errors.price}
            />
          </div>
          {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price}</p>}
        </div>

        <div>
          <label htmlFor="stock" className="block text-sm font-medium">Stock quantity</label>
          <input
            id="stock"
            type="text"
            inputMode="numeric"
            value={stockInput}
            onChange={onStockChange}
            placeholder="0"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            aria-invalid={!!errors.stock}
          />
          {errors.stock && <p className="mt-1 text-xs text-destructive">{errors.stock}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium">Status</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Images</label>
        <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img.path} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => void removeImage(img.path)}
                className="absolute right-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-xs shadow"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground hover:bg-accent/40">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="sr-only"
              disabled={uploading}
            />
            {uploading ? "Uploading…" : "+ Add"}
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {productId ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/seller/products" })}
            className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : productId ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </form>
  );
}
