-- Overlap · preserve complete meeting links
-- Run after 004_place.sql. This also upgrades databases that applied the
-- original 200-character place limit before long meeting links were supported.
alter table public.events drop constraint if exists events_place_length;
alter table public.events add constraint events_place_length
  check (char_length(place) <= 2048);
