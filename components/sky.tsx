"use client";

import { useEffect, useRef } from "react";
import dawnTall from "@/assets/sky/dawn-portrait.webp";
import dawnWide from "@/assets/sky/dawn.webp";
import dayTall from "@/assets/sky/day-portrait.webp";
import dayWide from "@/assets/sky/day.webp";
import duskTall from "@/assets/sky/dusk-portrait.webp";
import duskWide from "@/assets/sky/dusk.webp";
import nightTall from "@/assets/sky/night-portrait.webp";
import nightWide from "@/assets/sky/night.webp";
import sunsetTall from "@/assets/sky/sunset-portrait.webp";
import sunsetWide from "@/assets/sky/sunset.webp";
import { SKY_PHOTOS, skyAt, skyPhotos, skyTone, type SkyPhoto, type SkyWeights } from "@/lib/sky";

/*
 * The sky behind every page: a photo that follows a time of day, picked in
 * this order:
 *   1. the time under the pointer or finger (`setSkyHover`)
 *   2. the event's final time, once the organiser has picked it (`setSkyBase`)
 *   3. the time right now, where you are
 *
 * There's one photo for each part of the day (see lib/sky.ts). They're
 * stacked, and this file fades between them by changing their opacity, so the
 * sky drifts from one time to the next instead of jumping. Nothing here uses
 * React state: the photos are plain elements, updated directly.
 */

/** Each photo in two shapes: wide for most screens, tall for phones held upright. */
const SOURCES: Record<SkyPhoto, { wide: string; tall: string }> = {
  night: { wide: nightWide.src, tall: nightTall.src },
  dawn: { wide: dawnWide.src, tall: dawnTall.src },
  day: { wide: dayWide.src, tall: dayTall.src },
  sunset: { wide: sunsetWide.src, tall: sunsetTall.src },
  dusk: { wide: duskWide.src, tall: duskTall.src },
};

const TALL_SCREEN = "(orientation: portrait) and (max-width: 900px)";
const FADE_MS = 1100;

const none = (): SkyWeights => ({ night: 0, dawn: 0, day: 0, sunset: 0, dusk: 0 });

let hover: number | null = null;
let base: number | null = null;

// The fade: `shown` is on screen now, moving from `from` to `target`.
const shown = none();
let from = none();
let target = none();
let startedAt = 0;
let frame = 0;

let stage: HTMLElement | null = null;
let layers: Partial<Record<SkyPhoto, HTMLElement>> = {};
const ready = new Set<SkyPhoto>();
const loading = new Set<SkyPhoto>();

function minutesNow() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Fetch a photo; once it has arrived and decoded, it can take part in the fade. */
function load(photo: SkyPhoto) {
  if (ready.has(photo) || loading.has(photo)) return;
  loading.add(photo);
  const url = SOURCES[photo][window.matchMedia(TALL_SCREEN).matches ? "tall" : "wide"];
  const image = new Image();
  image.src = url;
  image.decode().then(
    () => {
      loading.delete(photo);
      ready.add(photo);
      layers[photo]?.style.setProperty("background-image", `url("${url}")`);
      paint();
    },
    () => loading.delete(photo), // offline or blocked: the plain colours stay
  );
}

/** Draw `shown`. Each layer's opacity is its share of itself and the layers under it. */
function draw() {
  let under = 0;
  for (const photo of SKY_PHOTOS) {
    under += shown[photo];
    const layer = layers[photo];
    if (layer) layer.style.opacity = under > 0 ? String(shown[photo] / under) : "0";
  }
  // Less than a whole sky (the first photo is still fading in): show the colours through.
  if (stage) stage.style.opacity = String(Math.min(1, under));
}

function step(now: number) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t = reduceMotion ? 1 : Math.min(1, (now - startedAt) / FADE_MS);
  const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  for (const photo of SKY_PHOTOS) {
    shown[photo] = from[photo] + (target[photo] - from[photo]) * eased;
  }
  draw();
  if (t < 1) frame = requestAnimationFrame(step);
}

function paint() {
  if (typeof document === "undefined") return;
  const minutes = hover ?? base ?? minutesNow();
  const root = document.documentElement;

  // Plain colours for the same time, behind the photos until they load.
  const { top, bottom } = skyAt(minutes);
  root.style.setProperty("--sky-top", top);
  root.style.setProperty("--sky-bottom", bottom);

  const wanted = skyPhotos(minutes);
  // Text on the sky turns dark at dawn, the one pale sky. Night-only effects use --sky-night.
  root.dataset.skyTone = skyTone(minutes);
  root.style.setProperty("--sky-night", wanted.night.toFixed(2));

  // Fade towards the photos we have; fetch the ones we don't.
  const next = none();
  let total = 0;
  for (const photo of SKY_PHOTOS) {
    if (wanted[photo] === 0) continue;
    if (ready.has(photo)) {
      next[photo] = wanted[photo];
      total += wanted[photo];
    } else {
      load(photo);
    }
  }
  if (total > 0) for (const photo of SKY_PHOTOS) next[photo] /= total;

  if (SKY_PHOTOS.every((photo) => next[photo] === target[photo])) return;
  from = { ...shown };
  target = next;
  startedAt = performance.now();
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(step);
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

/**
 * Fetch every photo ahead of time, once the browser is idle. For pages where
 * the sky is about to change a lot (an event's grids), so it never waits.
 */
export function preloadSky() {
  const connection = (navigator as { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;
  const start = () => SKY_PHOTOS.forEach(load);
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 1500);
}

export function Sky() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stage = stageRef.current;
    layers = {};
    for (const photo of SKY_PHOTOS) {
      const layer = stage?.querySelector<HTMLElement>(`[data-photo="${photo}"]`);
      if (layer) layers[photo] = layer;
    }

    // Turning a phone swaps the wide photos for tall ones (or back).
    const tallScreen = window.matchMedia(TALL_SCREEN);
    const reload = () => {
      ready.clear();
      paint();
    };
    tallScreen.addEventListener("change", reload);

    paint();
    const clock = setInterval(paint, 60_000); // keep up with the time
    return () => {
      clearInterval(clock);
      tallScreen.removeEventListener("change", reload);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="sky">
      <div ref={stageRef} className="sky-photos">
        {SKY_PHOTOS.map((photo) => (
          <div key={photo} data-photo={photo} className="sky-photo" />
        ))}
      </div>
    </div>
  );
}
