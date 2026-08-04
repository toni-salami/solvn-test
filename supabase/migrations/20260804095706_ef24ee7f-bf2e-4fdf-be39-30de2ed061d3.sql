CREATE TABLE public.seller_contacts (
  seller_id uuid PRIMARY KEY REFERENCES public.sellers(id) ON DELETE CASCADE,
  phone text,
  email text,
  payout_subaccount_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_contacts TO authenticated;
GRANT ALL ON public.seller_contacts TO service_role;

ALTER TABLE public.seller_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY seller_contacts_select_owner ON public.seller_contacts
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_contacts.seller_id AND s.user_id = auth.uid()));

CREATE POLICY seller_contacts_insert_owner ON public.seller_contacts
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_contacts.seller_id AND s.user_id = auth.uid()));

CREATE POLICY seller_contacts_update_owner ON public.seller_contacts
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_contacts.seller_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_contacts.seller_id AND s.user_id = auth.uid()));

CREATE TRIGGER update_seller_contacts_updated_at
BEFORE UPDATE ON public.seller_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.seller_contacts (seller_id, phone, email, payout_subaccount_id)
SELECT id, phone, email, payout_subaccount_id FROM public.sellers
WHERE phone IS NOT NULL OR email IS NOT NULL OR payout_subaccount_id IS NOT NULL;

ALTER TABLE public.sellers DROP COLUMN phone, DROP COLUMN email, DROP COLUMN payout_subaccount_id;