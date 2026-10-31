-- Overlap · step 1: tables
-- Paste into Supabase → SQL Editor → New query → Run.

create table public.events (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null check (char_length(name) between 1 and 100),
  date_mode    text not null check (date_mode in ('dates', 'weekdays')),
  -- 'dates' mode:    {2026-11-03,2026-11-05}
  -- 'weekdays' mode: {mon,wed,fri}
  days         text[] not null check (cardinality(days) between 1 and 31),
  -- Minutes after midnight, in the event's timezone. 540 = 09:00, 1260 = 21:00.
  start_minute smallint not null check (start_minute between 0 and 1410),
  end_minute   smallint not null check (end_minute between 30 and 1440),
  timezone     text not null, -- IANA name, e.g. 'Asia/Taipei'
  created_at   timestamptz not null default now(),
  check (start_minute < end_minute),
  check (start_minute % 30 = 0 and end_minute % 30 = 0)
);

create table public.participants (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 40),
  pin_hash         text, -- null = no PIN. Never sent to the browser.
  pin_failures     smallint not null default 0,
  pin_locked_until timestamptz,
  -- Slots this person is free, as '<day> <HH:MM>' in the event's timezone,
  -- e.g. {"2026-11-03 09:00","2026-11-03 09:30"} or {"mon 09:00"}.
  slots            text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One name per event, case-insensitive ("Alex" and "alex" are the same person).
create unique index participants_event_name_idx
  on public.participants (event_id, lower(name));

-- Row Level Security ON with NO policies = the browser's publishable key can't
-- read or write these tables at all. Only our Next.js server can, using the
-- secret key (which bypasses RLS).
alter table public.events enable row level security;
alter table public.participants enable row level security;
