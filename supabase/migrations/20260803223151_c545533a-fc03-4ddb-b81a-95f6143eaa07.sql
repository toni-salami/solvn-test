insert into public.sellers (id, user_id, business_name, storefront_slug, verification_status, location_type)
values ('11111111-1111-4111-8111-111111111111','26cd8c70-2097-4e9b-bc94-c07af908f048','QA Seller Two','qa-seller-two-tmp','pending','domestic');
insert into public.storefronts (id, seller_id, is_active) values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111', true);
insert into public.products (id, seller_id, title, price_ngn, stock_quantity, images, status)
values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','QA Widget Two', 25000, 10, '{}', 'active');