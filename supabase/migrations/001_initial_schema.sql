-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── units ─────────────────────────────────────────────────────────────────
create table units (
  id              uuid primary key default uuid_generate_v4(),
  unit_number     text not null unique,
  block           text,
  floor           text,
  square_footage  numeric(10,2) not null default 0,
  owner_profile_id    uuid,
  tenant_profile_id   uuid,
  created_at      timestamptz not null default now()
);

-- ─── profiles ───────────────────────────────────────────────────────────────
create type user_role as enum ('admin', 'resident');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  email       text not null,
  role        user_role not null default 'resident',
  unit_id     uuid references units(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Add FK back from units to profiles after profiles exists
alter table units
  add constraint fk_units_owner   foreign key (owner_profile_id)  references profiles(id),
  add constraint fk_units_tenant  foreign key (tenant_profile_id) references profiles(id);

-- ─── maintenance_rates ──────────────────────────────────────────────────────
create table maintenance_rates (
  id                uuid primary key default uuid_generate_v4(),
  effective_from    date not null,
  rate_per_sqft     integer,         -- cents per sqft (nullable if flat rate used)
  flat_rate_cents   integer,         -- flat rate in cents (nullable if per-sqft used)
  late_fee_percent  numeric(5,2) not null default 10,
  created_at        timestamptz not null default now(),
  constraint rate_type_check check (
    (rate_per_sqft is not null) or (flat_rate_cents is not null)
  )
);

-- ─── invoices ───────────────────────────────────────────────────────────────
create type invoice_status as enum ('pending', 'paid', 'overdue', 'partially_paid');

create table invoices (
  id              uuid primary key default uuid_generate_v4(),
  unit_id         uuid not null references units(id),
  period          text not null,           -- e.g. "2026-09"
  amount_due_cents integer not null,
  due_date        date not null,
  status          invoice_status not null default 'pending',
  created_at      timestamptz not null default now(),
  unique(unit_id, period)
);

-- ─── payments ───────────────────────────────────────────────────────────────
create type payment_method as enum ('payhere', 'bank_slip');
create type payment_status as enum ('pending_verification', 'confirmed', 'rejected');

create table payments (
  id            uuid primary key default uuid_generate_v4(),
  invoice_id    uuid not null references invoices(id),
  amount_cents  integer not null,
  method        payment_method not null,
  status        payment_status not null default 'pending_verification',
  slip_url      text,
  payhere_ref   text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ─── receipts ───────────────────────────────────────────────────────────────
create table receipts (
  id              uuid primary key default uuid_generate_v4(),
  payment_id      uuid not null references payments(id),
  pdf_url         text not null,
  receipt_number  text not null unique,
  generated_at    timestamptz not null default now()
);

-- ─── expenses ───────────────────────────────────────────────────────────────
create table expenses (
  id            uuid primary key default uuid_generate_v4(),
  category      text not null,
  description   text not null,
  amount_cents  integer not null,
  date          date not null,
  vendor        text,
  receipt_url   text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- ─── sinking_fund_ledger ────────────────────────────────────────────────────
create type sinking_fund_type as enum ('contribution', 'withdrawal');

create table sinking_fund_ledger (
  id            uuid primary key default uuid_generate_v4(),
  type          sinking_fund_type not null,
  amount_cents  integer not null,
  description   text not null,
  date          date not null,
  created_at    timestamptz not null default now()
);

-- ─── tickets ────────────────────────────────────────────────────────────────
create type ticket_status as enum ('open', 'in_progress', 'resolved');

create table tickets (
  id          uuid primary key default uuid_generate_v4(),
  unit_id     uuid not null references units(id),
  raised_by   uuid not null references profiles(id),
  category    text not null,
  description text not null,
  photo_url   text,
  status      ticket_status not null default 'open',
  created_at  timestamptz not null default now()
);

-- ─── announcements ──────────────────────────────────────────────────────────
create table announcements (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  body        text not null,
  posted_by   uuid not null references profiles(id),
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table profiles        enable row level security;
alter table units           enable row level security;
alter table invoices        enable row level security;
alter table payments        enable row level security;
alter table receipts        enable row level security;
alter table expenses        enable row level security;
alter table tickets         enable row level security;
alter table announcements   enable row level security;
alter table maintenance_rates enable row level security;
alter table sinking_fund_ledger enable row level security;

-- Helper: get the calling user's role
create or replace function get_my_role()
returns user_role language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- profiles: users see their own; admins see all
create policy "profiles_select_own"   on profiles for select using (id = auth.uid());
create policy "profiles_select_admin" on profiles for select using (get_my_role() = 'admin');
create policy "profiles_insert_self"  on profiles for insert with check (id = auth.uid());
create policy "profiles_update_self"  on profiles for update using (id = auth.uid());
create policy "profiles_update_admin" on profiles for update using (get_my_role() = 'admin');

-- units: admins full access; residents see their own
create policy "units_admin"   on units for all using (get_my_role() = 'admin');
create policy "units_resident" on units for select
  using (id = (select unit_id from profiles where id = auth.uid()));

-- invoices: admins full; residents see own unit's
create policy "invoices_admin" on invoices for all using (get_my_role() = 'admin');
create policy "invoices_resident" on invoices for select
  using (unit_id = (select unit_id from profiles where id = auth.uid()));

-- payments: admins full; residents see/create for own invoices
create policy "payments_admin" on payments for all using (get_my_role() = 'admin');
create policy "payments_resident_select" on payments for select
  using (invoice_id in (
    select id from invoices
    where unit_id = (select unit_id from profiles where id = auth.uid())
  ));
create policy "payments_resident_insert" on payments for insert
  with check (invoice_id in (
    select id from invoices
    where unit_id = (select unit_id from profiles where id = auth.uid())
  ));

-- receipts: admins full; residents see own
create policy "receipts_admin" on receipts for all using (get_my_role() = 'admin');
create policy "receipts_resident" on receipts for select
  using (payment_id in (
    select p.id from payments p
    join invoices i on i.id = p.invoice_id
    where i.unit_id = (select unit_id from profiles where id = auth.uid())
  ));

-- expenses: admins only
create policy "expenses_admin" on expenses for all using (get_my_role() = 'admin');

-- maintenance_rates: admins write; all authenticated read
create policy "rates_admin"  on maintenance_rates for all using (get_my_role() = 'admin');
create policy "rates_select" on maintenance_rates for select using (auth.uid() is not null);

-- sinking_fund_ledger: admins only
create policy "sinking_admin" on sinking_fund_ledger for all using (get_my_role() = 'admin');

-- tickets: admins see all; residents own
create policy "tickets_admin" on tickets for all using (get_my_role() = 'admin');
create policy "tickets_resident_select" on tickets for select
  using (unit_id = (select unit_id from profiles where id = auth.uid()));
create policy "tickets_resident_insert" on tickets for insert
  with check (
    raised_by = auth.uid() and
    unit_id = (select unit_id from profiles where id = auth.uid())
  );

-- announcements: admins write; all authenticated read
create policy "ann_admin"  on announcements for all using (get_my_role() = 'admin');
create policy "ann_select" on announcements for select using (auth.uid() is not null);

-- ─── Trigger: auto-mark overdue invoices ────────────────────────────────────
create or replace function mark_overdue_invoices()
returns void language sql security definer as $$
  update invoices
  set status = 'overdue'
  where status = 'pending'
    and due_date < current_date;
$$;

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index idx_invoices_unit     on invoices(unit_id);
create index idx_invoices_status   on invoices(status);
create index idx_invoices_period   on invoices(period);
create index idx_payments_invoice  on payments(invoice_id);
create index idx_tickets_unit      on tickets(unit_id);
create index idx_announcements_pin on announcements(pinned, created_at desc);
