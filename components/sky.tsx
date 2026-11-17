"use client";

import { useEffect } from "react";
import clouds from "@/assets/sky/cloud-world.webp";
import { clockMinutes, worldLight } from "@/lib/world-time";

// One illustrated sky, continuous light. The geometry never jumps between photos.
let hover: number | null = null;
let base: number | null = null;
let timeZone: string | null = null;

function paint() {
  if (typeof document === "undefined") return;
  const now = new Date();
  const minute = hover ?? base ?? (timeZone ? clockMinutes(now.getTime(), timeZone) : now.getHours() * 60 + now.getMinutes());
  const light = worldLight(minute);
  const root = document.documentElement;
  root.style.setProperty("--sky-top", light.top);
  root.style.setProperty("--sky-bottom", light.bottom);
  root.style.setProperty("--sky-brightness", String(light.brightness));
  root.style.setProperty("--sky-night", String(light.night));
  root.style.setProperty("--scene-ink", light.ink);
  root.dataset.skyTone = light.night > .45 ? "dark" : "light";
}

export function setSkyHover(minute: number | null) { hover = minute; paint(); }
export function setSkyBase(minute: number | null) { base = minute; paint(); }
export function setSkyTimeZone(zone: string | null) { timeZone = zone; paint(); }
export function preloadSky() {
  if (typeof window === "undefined") return;
  const image = new Image(); image.src = clouds.src;
}

const stars = [[8,12],[20,34],[31,10],[43,22],[55,7],[66,29],[74,14],[89,39],[94,9],[12,51],[81,57],[37,46]];
export function Sky() {
  useEffect(() => {
    paint();
    const timer = setInterval(paint, 30_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="sky" aria-hidden="true">
      <div className="sky-illustration" style={{ backgroundImage: `url("${clouds.src}")` }} />
      <div className="sky-starfield">{stars.map(([left,top],i)=><span key={i} style={{left:`${left}%`,top:`${top}%`}} />)}</div>
    </div>
  );
}
