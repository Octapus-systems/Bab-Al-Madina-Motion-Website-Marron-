-- ── Admins ────────────────────────────────────────────────────────────────
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

create policy "admins read own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- ── Shared updated_at trigger ─────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ── Products ──────────────────────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  name_ar text,
  description text,
  image_url text,
  pieces_per_carton integer not null default 30 check (pieces_per_carton > 0),
  unit_price_b2c numeric(10,2) not null check (unit_price_b2c >= 0),
  carton_price_b2c numeric(10,2) check (carton_price_b2c >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create policy "public reads active products" on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "admins insert products" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "admins update products" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete products" on public.products
  for delete to authenticated using (public.is_admin());

-- ── Customers ─────────────────────────────────────────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  first_name text not null,
  last_name text not null,
  email text,
  emirate text,
  address text,
  created_at timestamptz not null default now(),
  last_order_at timestamptz
);
alter table public.customers enable row level security;
create policy "admins read customers" on public.customers
  for select to authenticated using (public.is_admin());
create policy "admins update customers" on public.customers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Orders ────────────────────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001) unique,
  customer_id uuid references public.customers(id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  emirate text,
  address text not null,
  delivery_notes text,
  delivery_date date not null,
  payment_method text not null default 'cash_on_delivery'
    check (payment_method in ('cash_on_delivery', 'card_on_delivery')),
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled')),
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_customer_idx on public.orders (customer_id);
create policy "admins read orders" on public.orders
  for select to authenticated using (public.is_admin());
create policy "admins update orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity between 1 and 100),
  line_total numeric(10,2) not null
);
alter table public.order_items enable row level security;
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create policy "admins read order items" on public.order_items
  for select to authenticated using (public.is_admin());

-- ── Place an order (the only way the public can write) ───────────────────
-- Prices come from the products table, never from the browser.
create or replace function public.submit_website_order(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_address text,
  p_items jsonb,
  p_email text default null,
  p_emirate text default null,
  p_notes text default null,
  p_payment_method text default 'cash_on_delivery'
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal numeric(10,2) := 0;
  v_delivery_date date := (now() at time zone 'Asia/Dubai')::date + 1;
  v_item jsonb;
  v_product public.products;
  v_qty integer;
begin
  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = ''
     or coalesce(trim(p_phone), '') = '' or coalesce(trim(p_address), '') = '' then
    raise exception 'Please fill in your name, phone and address.';
  end if;
  if length(regexp_replace(p_phone, '\D', '', 'g')) < 9 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your basket is empty.';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'Too many items in one order.';
  end if;
  if p_payment_method not in ('cash_on_delivery', 'card_on_delivery') then
    raise exception 'Unknown payment method.';
  end if;

  insert into public.customers (phone, first_name, last_name, email, emirate, address, last_order_at)
  values (trim(p_phone), trim(p_first_name), trim(p_last_name), nullif(trim(p_email), ''),
          nullif(trim(p_emirate), ''), trim(p_address), now())
  on conflict (phone) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = coalesce(excluded.email, customers.email),
    emirate = coalesce(excluded.emirate, customers.emirate),
    address = excluded.address,
    last_order_at = now()
  returning id into v_customer_id;

  insert into public.orders (customer_id, first_name, last_name, phone, email, emirate, address,
                             delivery_notes, delivery_date, payment_method, subtotal, total)
  values (v_customer_id, trim(p_first_name), trim(p_last_name), trim(p_phone), nullif(trim(p_email), ''),
          nullif(trim(p_emirate), ''), trim(p_address), nullif(trim(p_notes), ''), v_delivery_date,
          p_payment_method, 0, 0)
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 100 then
      raise exception 'Invalid quantity.';
    end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and is_active;
    if not found then
      raise exception 'A product in your basket is no longer available.';
    end if;
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.unit_price_b2c, v_qty,
            v_product.unit_price_b2c * v_qty);
    v_subtotal := v_subtotal + v_product.unit_price_b2c * v_qty;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_subtotal,
    'delivery_date', v_delivery_date
  );
end $$;

revoke all on function public.submit_website_order(text, text, text, text, jsonb, text, text, text, text) from public;
grant execute on function public.submit_website_order(text, text, text, text, jsonb, text, text, text, text) to anon, authenticated;

-- ── Product images bucket ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;
create policy "admins upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins update product images" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
