"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { setSkyHover } from "@/components/sky";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import { useStageTimeZone } from "@/hooks/use-stage-time-zone";
import { timeToMinutes } from "@/lib/sky";
import { zonedParts } from "@/lib/slots";
import { timeZoneCity } from "@/lib/time";
import { nearestCity } from "@/lib/timezone-coords";

// The globe draws with WebGL, so it loads in the browser only, after the page.
const Globe = dynamic(() => import("@/components/globe"), { ssr: false });

/** Stars for the night sky: where each one sits (% of the box), its size and its rhythm. */
const STARS = [
  [6, 12, 2, 0], [14, 58, 1, 1], [21, 31, 2, 2], [27, 78, 1, 0], [33, 9, 1, 1], [38, 49, 2, 2],
  [44, 88, 1, 0], [52, 21, 1, 2], [58, 66, 2, 1], [63, 5, 1, 0], [69, 41, 1, 2], [74, 83, 2, 0],
  [81, 17, 1, 1], [86, 56, 2, 2], [92, 34, 1, 0], [96, 74, 1, 1], [10, 86, 1, 2], [48, 3, 2, 1],
] as const;

/**
 * The home page's centrepiece: a big globe you can spin. It faces the
 * timezone of the event being created. Spin it by hand and the whole page's
 * sky follows, to the time of day it is right now in the place facing you.
 */
export function HeroGlobe() {
  const browserTimeZone = useBrowserTimeZone();
  const formTimeZone = useStageTimeZone();
  const timeZone = formTimeZone ?? browserTimeZone;

  // The city facing you while the globe is spun by hand.
  const [spunTo, setSpunTo] = useState<string | null>(null);
  const shown = spunTo ?? timeZone;

  // A clock for the label, ticking twice a minute.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => setSkyHover(null), []);

  function handleFace(longitude: number | null) {
    if (longitude === null) {
      setSpunTo(null);
      setSkyHover(null); // back to the time here
      return;
    }
    const city = nearestCity(longitude);
    setSpunTo(city);
    setSkyHover(timeToMinutes(zonedParts(Date.now(), city).time));
  }

  return (
    <div className="relative mx-auto mt-6 w-full max-w-[38rem] max-lg:mask-b-from-70% max-lg:mask-b-to-100% lg:-mt-2 lg:-ml-6">
      {/* Night only: a few stars that twinkle around the globe. */}
      <div aria-hidden className="stars pointer-events-none absolute inset-0">
        {STARS.map(([left, top, size, rhythm], i) => (
          <span
            key={i}
            data-rhythm={rhythm}
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
          />
        ))}
      </div>

      {/* The glow of an atmosphere, so the globe lifts off the sky. */}
      <div aria-hidden className="globe-halo pointer-events-none absolute inset-[7%] rounded-full" />

      {/* On phones only the top of the globe shows: the form is what matters there. */}
      <div className="relative max-lg:-mb-[38%]">
        {timeZone ? (
          <Globe timeZone={timeZone} cities onFace={handleFace} />
        ) : (
          <div className="aspect-square w-full" />
        )}
      </div>

      {shown && now !== null && (
        <p
          aria-hidden
          className="glass absolute top-[9%] right-[4%] flex items-baseline gap-2 rounded-full px-3.5 py-1.5 text-sm max-lg:top-3 max-lg:right-1/2 max-lg:translate-x-1/2"
        >
          <span className="font-medium">{timeZoneCity(shown)}</span>
          <span className="text-muted tabular-nums">{zonedParts(now, shown).time}</span>
        </p>
      )}

      <p className="pointer-events-none absolute right-0 bottom-[6%] left-0 text-center text-sm text-on-sky-muted [text-shadow:0_1px_8px_var(--on-sky-shade)] max-lg:hidden">
        Spin the globe to see the sky somewhere else.
      </p>
    </div>
  );
}
