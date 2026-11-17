# The little world

The new direction replaces the two-column marketing layout with one spatial
observatory: original typography, an illustrated cloud world, a real interactive
globe, city clocks and a time rail. The composition is centered on the globe;
there is no example-availability card or invented participant data.

## Interaction

City clocks always show the same instant, including each city’s calendar date.
The time rail previews a local clock reading in the selected city; local times
are converted with IANA timezone rules, including daylight saving and fractional
offsets. Back to now returns every clock to live time. Dragging the globe briefly
previews the nearest known city; labelled city controls offer a keyboard route.
The globe’s approximate city lookup is not participant geolocation.

The sky uses one generated illustration. Its geometry never cuts between
unrelated photographs: light, colour and a restrained star layer change instead.
The original photograph sources remain credited at /credits.

## A real plan

Find our time opens a native modal while the globe moves aside. The real form
has three steps: name/place, dates/weekdays, then time window/timezone. Going
back preserves choices and calendar navigation. Submission reads the current
text in time fields, so an immediate click does not submit an old blurred value.
No date is silently preselected. A selected globe city supplies a default
zone, which the user can override. Existing host links, sharing, PINs, live
responses, final plans and calendar exports remain the application’s real flow.

## Runtime

The globe renders on demand and stops when settled, hidden or offscreen. It
honours reduced-motion settings and has a local SVG fallback when WebGL fails.
City/time controls and the scheduling form remain usable without WebGL.
The cloud artwork is a small WebP; UI and English/Chinese preview fonts are
self-hosted. Font licences and sources are in assets/fonts/.

## Rollout and checks

This branch requires migration 004_place after 001–003. Installations that
already applied the original 200-character place constraint also need
005_place_length, which safely upgrades the limit to 2,048 characters.

Verify the production build, unit tests, light/dark/night layouts at desktop,
390px and 320px, keyboard/modal behaviour, and the complete create/join/save/
finalise/reopen/calendar workflow. Local browser smoke tests use an isolated
REST fixture, never a live Supabase database. Production Realtime delivery and
field performance remain deployment checks; this work does not claim an award.
