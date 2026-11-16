"use client";

import { useEffect } from "react";
import { skyAt } from "@/lib/sky";

/*
 * The sky behind every page. Its colour follows a time of day, picked in
 * this order:
 *   1. the time under the pointer or finger on a grid (`setSkyHover`)
 *   2. the event's final time, once the organiser has picked it (`setSkyBase`)
 *   3. the time right now, where you are
 *
 * The colours are written straight to two CSS variables on <html>, so nothing
 * re-renders; globals.css transitions them, which is what makes the sky fade
 * from one time to the next instead of jumping.
 */

let hover: number | null = null;
let base: number | null = null;

function minutesNow() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function paint() {
  if (typeof document === "undefined") return;
  const { top, bottom } = skyAt(hover ?? base ?? minutesNow());
  const style = document.documentElement.style;
  style.setProperty("--sky-top", top);
  style.setProperty("--sky-bottom", bottom);
}

/** The time being pointed at, in minutes after midnight (null: nothing). */
export function setSkyHover(minutes: number | null) {
  if (hover === minutes) return;
  hover = minutes;
  paint();
}

/** The time the page rests on when nothing is pointed at (null: the time now). */
export function setSkyBase(minutes: number | null) {
  if (base === minutes) return;
  base = minutes;
  paint();
}

export function Sky() {
  useEffect(() => {
    paint();
    const timer = setInterval(paint, 60_000); // keep up with the clock
    return () => clearInterval(timer);
  }, []);

  return <div aria-hidden className="sky" />;
}
