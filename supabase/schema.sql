create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  farm_name text,
  email text,
  industry_type text,
  initial_setup_completed boolean default false,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now()),
  constraint profiles_user_id_key unique (user_id),
  constraint profiles_industry_type_check check (
    industry_type is null or industry_type in ('米作', '野菜', '果樹', '花き', '畜産', '酪農', 'その他')
  )
);

create table if not exists public.crops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  memo text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  crop_id uuid references public.crops(id) on delete set null,
  sale_date date not null,
  buyer text,
  quantity numeric,
  unit text,
  unit_price numeric,
  amount numeric not null check (amount >= 0),
  memo text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  machine_type text,
  purchase_date date,
  purchase_price numeric,
  memo text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  crop_id uuid references public.crops(id) on delete set null,
  machine_id uuid references public.machines(id) on delete set null,
  expense_date date not null,
  category text not null,
  cost_type text,
  amount numeric not null check (amount >= 0),
  vendor text,
  receipt_image_url text,
  memo text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

create table if not exists public.machine_repairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  machine_id uuid references public.machines(id) on delete cascade,
  repair_date date not null,
  repair_detail text,
  amount numeric,
  vendor text,
  memo text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.crops enable row level security;
alter table public.sales enable row level security;
alter table public.machines enable row level security;
alter table public.expenses enable row level security;
alter table public.machine_repairs enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_crops_updated_at on public.crops;
create trigger set_crops_updated_at before update on public.crops
for each row execute function public.set_updated_at();

drop trigger if exists set_sales_updated_at on public.sales;
create trigger set_sales_updated_at before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists set_machines_updated_at on public.machines;
create trigger set_machines_updated_at before update on public.machines
for each row execute function public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_machine_repairs_updated_at on public.machine_repairs;
create trigger set_machine_repairs_updated_at before update on public.machine_repairs
for each row execute function public.set_updated_at();

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

create policy "crops_select_own" on public.crops for select using (auth.uid() = user_id);
create policy "crops_insert_own" on public.crops for insert with check (auth.uid() = user_id);
create policy "crops_update_own" on public.crops for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "crops_delete_own" on public.crops for delete using (auth.uid() = user_id);

create policy "sales_select_own" on public.sales for select using (auth.uid() = user_id);
create policy "sales_insert_own" on public.sales for insert with check (auth.uid() = user_id);
create policy "sales_update_own" on public.sales for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sales_delete_own" on public.sales for delete using (auth.uid() = user_id);

create policy "machines_select_own" on public.machines for select using (auth.uid() = user_id);
create policy "machines_insert_own" on public.machines for insert with check (auth.uid() = user_id);
create policy "machines_update_own" on public.machines for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "machines_delete_own" on public.machines for delete using (auth.uid() = user_id);

create policy "expenses_select_own" on public.expenses for select using (auth.uid() = user_id);
create policy "expenses_insert_own" on public.expenses for insert with check (auth.uid() = user_id);
create policy "expenses_update_own" on public.expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_delete_own" on public.expenses for delete using (auth.uid() = user_id);

create policy "machine_repairs_select_own" on public.machine_repairs for select using (auth.uid() = user_id);
create policy "machine_repairs_insert_own" on public.machine_repairs for insert with check (auth.uid() = user_id);
create policy "machine_repairs_update_own" on public.machine_repairs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "machine_repairs_delete_own" on public.machine_repairs for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "receipts_select_own_folder" on storage.objects
for select using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "receipts_insert_own_folder" on storage.objects
for insert with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "receipts_update_own_folder" on storage.objects
for update using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "receipts_delete_own_folder" on storage.objects
for delete using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
