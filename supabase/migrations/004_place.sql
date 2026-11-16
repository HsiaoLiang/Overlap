-- Overlap · where to meet (optional)
-- Paste into Supabase → SQL Editor → New query → Run (after 001–003).

-- 1. A place or a meeting link, set by the organiser when creating the event
--    or any time after. Free text: "Blue Bottle, Xinyi" or "https://meet…".
alter table public.events add column place text;
alter table public.events add constraint events_place_length check (char_length(place) <= 200);

-- 2. Live updates: send the place along with the final time, and also when
--    only the place changes (see 003_finalise.sql for the original).
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
      'finalised_at', new.finalised_at,
      'place', new.place
    ),
    'event',                    -- message type
    'event:' || new.id::text,   -- channel name
    false                       -- public channel
  );
  return null;
end;
$$;

drop trigger events_broadcast on public.events;
create trigger events_broadcast
  after update of final_start, final_end, finalised_at, place on public.events
  for each row execute function public.broadcast_event_change();
