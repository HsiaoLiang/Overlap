-- Overlap · weekly product numbers
-- NOT a migration: it only reads data. Paste into Supabase → SQL Editor → Run.
--
-- One row per week (weeks start on Monday, Taiwan time — change the timezone
-- below if you like). Each row describes the events CREATED that week:
--   events_created              how many events were created
--   participants                how many people responded to those events
--   median_participants         the typical number of people per event
--   pct_with_3plus_participants share of events with 3 or more people
--   pct_finalised               share of events the organiser closed with a final time

with per_event as (
  select
    e.id,
    date_trunc('week', e.created_at at time zone 'Asia/Taipei')::date as week_starting,
    e.finalised_at is not null as finalised,
    count(p.id) as participants
  from public.events e
  left join public.participants p on p.event_id = e.id
  group by e.id
)
select
  week_starting,
  count(*) as events_created,
  sum(participants) as participants,
  percentile_cont(0.5) within group (order by participants) as median_participants,
  round(100.0 * avg((participants >= 3)::int), 1) as pct_with_3plus_participants,
  round(100.0 * avg(finalised::int), 1) as pct_finalised
from per_event
group by week_starting
order by week_starting desc;
