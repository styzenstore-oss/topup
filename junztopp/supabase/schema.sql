-- Jalankan file ini di Supabase Dashboard > SQL Editor

-- Cache produk dari OkeConnect, supaya tidak hit API OkeConnect tiap kali
-- ada pengunjung buka halaman produk.
create table if not exists products (
  code text primary key,           -- kode produk OkeConnect, misal 'ML86'
  category text,                   -- contoh: 'Mobile Legends'
  name text not null,              -- nama produk yang ditampilkan
  price numeric not null,          -- harga modal dari OkeConnect
  sell_price numeric not null,     -- harga jual ke pembeli (modal + margin)
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- Riwayat pembelian / order.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  ref_id text unique not null,          -- ID unik order, dikirim ke OkeConnect & StenlyPay
  user_id uuid references auth.users(id), -- null kalau checkout tanpa login (guest)
  guest_contact text,                    -- WA/email guest, untuk guest checkout
  product_code text not null references products(code),
  product_name text not null,
  destination text not null,             -- ID game / nomor tujuan
  price numeric not null,                -- harga jual yang ditagih ke pembeli
  payment_status text default 'pending', -- pending | paid | expired | failed
  payment_url text,
  payment_trx_id text,
  topup_status text default 'waiting_payment', -- waiting_payment | processing | success | failed
  serial_number text,                    -- SN dari OkeConnect kalau ada
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_ref on orders(ref_id);

-- Row Level Security: user hanya boleh lihat order miliknya sendiri.
alter table orders enable row level security;

create policy "user lihat order sendiri"
  on orders for select
  using (auth.uid() = user_id);

create policy "user bisa insert order sendiri"
  on orders for insert
  with check (auth.uid() = user_id or user_id is null);

-- Catatan: semua update status (payment_status, topup_status) dilakukan
-- lewat API route server (pakai supabaseAdmin / service role key) yang
-- otomatis melewati RLS, jadi tidak perlu policy update untuk user biasa.

-- products dibaca publik (tanpa login), tidak perlu RLS ketat:
alter table products enable row level security;
create policy "produk bisa dibaca semua orang"
  on products for select
  using (true);
