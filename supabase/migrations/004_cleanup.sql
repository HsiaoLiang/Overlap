-- Overlap · delete old events automatically
-- Paste into Supabase → SQL Editor → New query → Run (after 001–003).
--
-- Each event goes, with its participants (participants.event_id is
-- "on delete cascade"), once it can no longer be useful:
--   dates events:    30 days after the event's last date
--   weekday events:  90 days after the last activity — the latest of the
--                    event's created_at, finalised_at and its participants'
--                    updated_at
-- "Days" are counted in the event's own timezone. Keep the numbers in sync
-- with lib/retention.ts, which shows the date on the event page.

create extension if not exists pg_cron;

create or replace function public.delete_old_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted integer;
begin
  with doomed as (
    select e.id
    from public.events e
    where
      case e.date_mode
        when 'dates' then
          -- ISO dates sort the same as text, so max() finds the last one.
          (select max(d) from unnest(e.days) as d)::date + 30
            < (now() at time zone e.timezone)::date
        else
          (greatest(
             e.created_at,
             e.finalised_at,
             (select max(p.updated_at) from public.participants p where p.event_id = e.id)
           ) at time zone e.timezone)::date + 90
            < (now() at time zone e.timezone)::date
      end
  ),
  removed as (
    delete from public.events e using doomed d where e.id = d.id returning 1
  )
  select count(*) into deleted from removed;

  return deleted;
end;
$$;

-- This function lives in the exposed "public" schema: only the database
-- itself (pg_cron, the SQL editor) may run it, never the browser's API key.
revoke execute on function public.delete_old_events() from public, anon, authenticated;

-- Every day at 03:17 UTC. Re-running this migration replaces the job.
select cron.schedule('delete-old-events', '17 3 * * *', 'select public.delete_old_events()');

-- To check it by hand (in a transaction you roll back), insert an event whose
-- last date is 31 days ago and one whose last date is 29 days ago, run
-- `select public.delete_old_events();` and only the first (and its
-- participants) should be gone. Same for a weekday event whose created_at is
-- 91 days ago vs. one with a participant whose updated_at is yesterday.
