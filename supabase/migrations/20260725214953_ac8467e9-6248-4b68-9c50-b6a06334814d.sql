
-- Grant anon read on publicly-readable tables (writes stay locked to authenticated via policies)
GRANT SELECT ON public.storefronts TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.reviews TO anon;

-- ============ sellers ============
CREATE POLICY "sellers_select_own" ON public.sellers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sellers_insert_own" ON public.sellers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sellers_update_own" ON public.sellers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ storefronts ============
CREATE POLICY "storefronts_select_public_active" ON public.storefronts
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "storefronts_select_owner" ON public.storefronts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = storefronts.seller_id AND s.user_id = auth.uid())
  );
CREATE POLICY "storefronts_insert_owner" ON public.storefronts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = storefronts.seller_id AND s.user_id = auth.uid())
  );
CREATE POLICY "storefronts_update_owner" ON public.storefronts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = storefronts.seller_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = storefronts.seller_id AND s.user_id = auth.uid()));
CREATE POLICY "storefronts_delete_owner" ON public.storefronts
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = storefronts.seller_id AND s.user_id = auth.uid())
  );

-- ============ products ============
CREATE POLICY "products_select_public_active" ON public.products
  FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "products_select_owner" ON public.products
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = products.seller_id AND s.user_id = auth.uid())
  );
CREATE POLICY "products_insert_owner" ON public.products
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = products.seller_id AND s.user_id = auth.uid())
  );
CREATE POLICY "products_update_owner" ON public.products
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = products.seller_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = products.seller_id AND s.user_id = auth.uid()));
CREATE POLICY "products_delete_owner" ON public.products
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = products.seller_id AND s.user_id = auth.uid())
  );

-- ============ buyers ============
CREATE POLICY "buyers_select_own" ON public.buyers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "buyers_insert_own" ON public.buyers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "buyers_update_own" ON public.buyers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ shipping_addresses ============
CREATE POLICY "shipping_addresses_select_own" ON public.shipping_addresses
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = shipping_addresses.buyer_id AND b.user_id = auth.uid())
  );
CREATE POLICY "shipping_addresses_insert_own" ON public.shipping_addresses
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = shipping_addresses.buyer_id AND b.user_id = auth.uid())
  );
CREATE POLICY "shipping_addresses_update_own" ON public.shipping_addresses
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = shipping_addresses.buyer_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = shipping_addresses.buyer_id AND b.user_id = auth.uid()));
CREATE POLICY "shipping_addresses_delete_own" ON public.shipping_addresses
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = shipping_addresses.buyer_id AND b.user_id = auth.uid())
  );

-- ============ orders (SELECT only; writes are service-role) ============
CREATE POLICY "orders_select_buyer_or_seller" ON public.orders
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = orders.buyer_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = orders.seller_id AND s.user_id = auth.uid())
  );

-- ============ order_items (SELECT only; writes are service-role) ============
CREATE POLICY "order_items_select_buyer_or_seller" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = o.buyer_id AND b.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = o.seller_id AND s.user_id = auth.uid())
        )
    )
  );

-- ============ delivery_tracking (SELECT only; writes are service-role) ============
CREATE POLICY "delivery_tracking_select_buyer_or_seller" ON public.delivery_tracking
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = delivery_tracking.order_id
        AND (
          EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = o.buyer_id AND b.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = o.seller_id AND s.user_id = auth.uid())
        )
    )
  );

-- ============ notifications (SELECT only for recipient; writes are service-role) ============
CREATE POLICY "notifications_select_recipient" ON public.notifications
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = notifications.recipient_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = notifications.recipient_id AND s.user_id = auth.uid())
  );

-- ============ reviews ============
CREATE POLICY "reviews_select_public" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews_insert_buyer_of_order" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.buyers b WHERE b.id = reviews.buyer_id AND b.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = reviews.order_id AND o.buyer_id = reviews.buyer_id)
  );

-- ============ verification_documents ============
CREATE POLICY "verification_documents_select_owner" ON public.verification_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = verification_documents.seller_id AND s.user_id = auth.uid())
  );
CREATE POLICY "verification_documents_insert_owner" ON public.verification_documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = verification_documents.seller_id AND s.user_id = auth.uid())
  );
