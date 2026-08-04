CREATE OR REPLACE FUNCTION public.seller_has_active_storefront(_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.storefronts sf WHERE sf.seller_id = _seller_id AND sf.is_active = true)
$$;

DROP POLICY IF EXISTS sellers_select_public_storefront ON public.sellers;
CREATE POLICY sellers_select_public_storefront ON public.sellers
FOR SELECT TO anon, authenticated
USING (public.seller_has_active_storefront(id));