-- Overlap · step 4: realtime updates
-- Paste into Supabase → SQL Editor → New query → Run.
--
-- Whenever someone joins or saves their availability, Postgres itself sends
-- a Realtime "broadcast" message on the channel `event:<event id>`. Browsers
-- viewing that event listen on the channel and update instantly.
--
-- The message carries only public fields (never pin_hash), and the tables stay
-- private: listeners can't query anything, they just receive these messages.

create or replace function public.broadcast_participant_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'id', new.id,
      'name', new.name,
      'slots', new.slots,
      'hasPin', new.pin_hash is not null
    ),
    'participant',                   -- message type
    'event:' || new.event_id::text,  -- channel name
    false                            -- public channel (no login needed to listen)
  );
  return null;
end;
$$;

-- Only fire when the name or availability changes (not on PIN-attempt counters).
create trigger participants_broadcast
  after insert or update of name, slots on public.participants
  for each row execute function public.broadcast_participant_change();
