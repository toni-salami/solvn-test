ALTER TABLE public.reviews ADD CONSTRAINT reviews_order_id_unique UNIQUE (order_id);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;