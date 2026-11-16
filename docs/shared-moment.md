# Shared moment

The design direction for `sky-globe-experiment` is to make the moment of
overlap visible, then give the real scheduling task a calm workspace.

## Home

The introduction pairs editorial typography with a lightweight SVG world and
three availability ribbons. A native range input moves one UTC instant across
London, New York and Taipei. The intersection lights up when all three example
people are available. City buttons select the sky preview; a reset returns to
the current time in the selected event timezone.

This is explicitly an example for 18 November 2026 in UTC. It does not query
participants, infer their locations, create events or preselect real dates.
Cross-midnight clocks show the next-day offset. All important controls work
with a keyboard and without WebGL.

The create-event link is visible before the example on phones. The real form
comes before instructions and saved events in both mobile reading and keyboard
order. The optional place field uses a disclosure to keep the main task short.

## Workspace

- Teal means personal availability; checks mark the beginning of each painted
  block. Gold density means group overlap. Candidates use an outline and label.
- A new visitor sees the join form first. After joining, focus moves to their
  grid. Recommendations stay below the task for that initial response.
- One best candidate leads; alternatives expand on demand.
- The sky changes for an explicit preview, a selected viewer timezone or the
  final plan. Painting a grid does not change the whole page's atmosphere.
- A final plan prioritizes the time, place and calendar action. Responses remain
  available in a disclosure. Organiser actions and host-token verification are
  retained.
- Meeting links retain their full destinations. A sole link is displayed as a
  compact action and hostname, rather than pages of query parameters.

## Fonts and assets

The UI fonts and English/Chinese preview fonts are local, with their licenses
and sources in `assets/fonts/`. The larger CJK font is a server asset, not a
client download. Existing sky-photo credits remain available at `/credits`.

## Database rollout

This branch still requires `004_place.sql` after migrations 001–003. Existing
installations that already ran the original 200-character version of 004 must
also run `005_place_length.sql`, which upgrades the limit to 2,048 characters.
The upgrade can be rerun safely. The application rejects oversize values rather
than silently truncating links.

## Verification

- Unit tests cover the example's shared instant, midnight rollover, intersection
  boundaries, long meeting links, punctuation and action validation.
- A production build renders the home page and link preview using local fonts.
  Server tracing includes the preview fonts for deployment.
- Browser smoke checks use the production server with an isolated in-memory
  REST fixture. They cover creating, joining, painting, saving, finalising and
  exporting a weekly calendar; they do not write to a live Supabase project.
- Desktop, 390px and 320px layouts, light/dark themes, native slider keyboard
  controls and the example's next-day labels are checked.

Real Supabase Realtime delivery and production network performance still need
to be checked on the deployed branch. This implementation does not claim an
award or a measured field Core Web Vitals score.
