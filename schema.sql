-- 1. ENUM 정의
create type order_status as enum (
  'CREATED', 'WAITING_FOR_DEPOSIT', 'PAID', 
  'AUTO_CANCELED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'LATE_DEPOSIT'
);
create type product_sku as enum ('meat', 'kimchi', 'half', 'ricecake_1kg');

-- 2. Customers
create table customers (
  id uuid default gen_random_uuid() primary key,
  phone text not null unique,
  name text not null,
  marketing_opt_in boolean default false,
  created_at timestamptz default now()
);

-- 3. Orders
create table orders (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) not null,
  apt_code text not null,
  apt_name text not null,
  dong text not null,
  ho text not null,
  delivery_date date not null,
  cutoff_at timestamptz not null,
  status order_status default 'CREATED',
  total_qty int not null check (total_qty >= 3),
  total_amount int not null,
  payment_method text default 'vbank',
  vbank_num text,
  vbank_bank text,
  vbank_holder text,
  portone_payment_id text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Order Items
create table order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  sku product_sku not null,
  qty int not null default 1,
  unit_price int not null,
  line_amount int not null
);

-- Indexes
create index idx_orders_phone on customers(phone);
create index idx_orders_apt_date on orders(apt_code, delivery_date);