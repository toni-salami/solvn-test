ALTER TABLE public.sellers
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'no_subscription';

ALTER TABLE public.sellers
  ADD CONSTRAINT sellers_subscription_status_check
  CHECK (subscription_status IN ('no_subscription','trialing','active','past_due','canceled'));

-- Sellers may read their own row (existing owner-scoped SELECT policy covers all columns,
-- including subscription_status). Existing owner UPDATE policy would allow self-writes, so
-- restrict column-level UPDATE privileges: authenticated users may update only these columns.
REVOKE UPDATE ON public.sellers FROM authenticated;
GRANT UPDATE (business_name, storefront_slug, description, location_type, updated_at)
  ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;

CREATE TABLE public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'paystack',
  event_id text NOT NULL,
  event_type text NOT NULL,
  subscription_code text,
  customer_email text,
  seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscription_events_provider_event_id_key
  ON public.subscription_events (provider, event_id);
CREATE INDEX subscription_events_seller_id_idx ON public.subscription_events (seller_id);

GRANT ALL ON public.subscription_events TO service_role;

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) can access this table.

CREATE TRIGGER update_subscription_events_updated_at
  BEFORE UPDATE ON public.subscription_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();