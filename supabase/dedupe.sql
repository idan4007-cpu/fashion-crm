-- Merge duplicate customers (same phone digits), remove identical duplicate
-- orders, and add unique indexes so duplicates can't be created again.
begin;

-- 1. Customers with the same phone: keep the one with most orders (then oldest),
--    move all orders to it, delete the rest.
create temp table merge_map on commit drop as
select id, keeper from (
  select id,
         row_number()  over w as rn,
         first_value(id) over w as keeper
  from (
    select c.id, c.created_at, regexp_replace(c.phone, '\D', '', 'g') as p,
           (select count(*) from orders o where o.customer_id = c.id) as n
    from customers c
    where c.phone is not null and regexp_replace(c.phone, '\D', '', 'g') <> ''
  ) x
  window w as (partition by p order by n desc, created_at, id::text)
) r
where rn > 1;

update orders o set customer_id = m.keeper from merge_map m where o.customer_id = m.id;
delete from customers where id in (select id from merge_map);

-- 2. Identical orders (same number, customer, product, size, color, price):
--    keep one (prefer the one linked to a shipment), delete the rest.
delete from orders o
using (
  select id, row_number() over (
           partition by order_number, customer_id, product, size, color, price
           order by exists (select 1 from shipments s where s.order_id = orders.id) desc, created_at, id::text
         ) as rn
  from orders
  where order_number is not null
) d
where o.id = d.id and d.rn > 1;

-- 3. Block future duplicates.
create or replace function public.phone_digits(t text) returns text
language sql immutable as $$ select nullif(regexp_replace(coalesce(t, ''), '\D', '', 'g'), '') $$;

create unique index if not exists customers_phone_unique
  on customers (public.phone_digits(phone));

create unique index if not exists orders_no_duplicate_items
  on orders (order_number, customer_id, product, size, color) nulls not distinct
  where order_number is not null;

commit;

-- Check: both should be 0
select
  (select count(*) from (select 1 from orders where order_number is not null
     group by order_number, customer_id, product, size, color, price having count(*) > 1) a) as duplicate_orders,
  (select count(*) from (select 1 from customers where public.phone_digits(phone) is not null
     group by public.phone_digits(phone) having count(*) > 1) b) as duplicate_customers;
