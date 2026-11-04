-- Overlap · organiser can close the event and announce a final time
-- Paste into Supabase → SQL Editor → New query → Run (after 001 and 002).

-- 1. Organiser identity, without accounts.
--    createEvent generates a long random token, gives it to the organiser's
--    browser, and stores only its SHA-256 hash here. Never sent to browsers.
alter table public.events add column host_token_hash text;

-- 2. The final time, once the organiser picks one.
--    Stored like participants.slots: in the event's own timezone, as slot keys.
--      final_start: the first slot,    e.g. '2026-11-19 19:00' or 'wed 19:00'
--      final_end:   the end (exclusive), e.g. '2026-11-19 20:30' or 'wed 20:30'
--    Weekday events therefore get a weekday + time, with no date.
alter table public.events add column final_start text;
alter table public.events add column final_end text;
alter table public.events add column finalised_at timestamptz;

-- All three are set together, or none (= the event is open).
alter table public.events add constraint events_final_all_or_nothing check (
  (final_start is null) = (final_end is null)
  and (final_start is null) = (finalised_at is null)
);

-- 3. Live updates: when the event is closed or reopened, broadcast the new
--    state on the same channel as participant changes (see 002_realtime.sql).
--    Only public fields — never host_token_hash.
create or replace function public.broadcast_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'final_start', new.final_start,
      'final_end', new.final_end,
      'finalised_at', new.finalised_at
    ),
    'event',                    -- message type
    'event:' || new.id::text,   -- channel name
    false                       -- public channel
  );
  return null;
end;
$$;

create trigger events_broadcast
  after update of final_start, final_end, finalised_at on public.events
  for each row execute function public.broadcast_event_change();
