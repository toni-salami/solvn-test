DROP POLICY IF EXISTS sellers_select_public_storefront ON public.sellers;
CREATE POLICY sellers_select_public_storefront ON public.sellers
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.storefronts sf WHERE sf.seller_id = sellers.id AND sf.is_active = true));