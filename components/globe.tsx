"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { Globe as GlobeIcon } from "lucide-react";
import { timeZoneCoords } from "@/lib/timezone-coords";

type RGB = [number, number, number];

/** "#6e56cf" → [0.43, 0.34, 0.81] (what the globe's shader wants). */
function rgb(hex: string, fallback: RGB): RGB {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return match ? (match.slice(1).map((v) => parseInt(v, 16) / 255) as RGB) : fallback;
}

/** The globe's colours, read from the design tokens so it follows the theme. */
function readTheme() {
  const css = getComputedStyle(document.documentElement);
  const isDark = css.colorScheme.includes("dark");
  return {
    dark: isDark ? 1 : 0,
    baseColor: isDark ? ([0.42, 0.42, 0.5] as RGB) : ([1, 1, 1] as RGB),
    glowColor: rgb(css.getPropertyValue("--canvas"), [1, 1, 1]),
    markerColor: rgb(css.getPropertyValue(isDark ? "--accent-ink" : "--accent"), [0.43, 0.34, 0.81]),
    mapBrightness: isDark ? 7 : 5,
  };
}

/** Which way the globe faces to show a place front and centre. */
function facing(lat: number, lon: number) {
  return {
    phi: Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2),
    // Tilt towards the place, but not so far that the map looks upside down.
    theta: (Math.max(-40, Math.min(40, lat)) * Math.PI) / 180,
  };
}

/** The shortest way round from one angle to another. */
function turn(from: number, to: number) {
  const full = Math.PI * 2;
  return ((((to - from) % full) + full + Math.PI) % full) - Math.PI;
}

/**
 * A small dotted globe that turns to face a timezone, with a dot on its city.
 * Decorative: the timezone's name is always written next to it.
 */
export default function Globe({ timeZone, size = 64 }: { timeZone: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(facing(0, 0));
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const [failed, setFailed] = useState(false);

  // Start the globe once, then keep easing it towards wherever it should face.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const current = { ...targetRef.current };

    let globe: ReturnType<typeof createGlobe>;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: pixelRatio,
        width: size * pixelRatio,
        height: size * pixelRatio,
        phi: current.phi,
        theta: current.theta,
        diffuse: 1.2,
        mapSamples: 9000,
        markerElevation: 0.02,
        ...readTheme(),
      });
    } catch {
      // No WebGL (old device, blocked GPU…): fall back to the plain icon.
      queueMicrotask(() => setFailed(true));
      return;
    }
    globeRef.current = globe;

    // Follow the theme toggle and the system's light/dark setting.
    const restyle = () => globe.update(readTheme());
    const themeObserver = new MutationObserver(restyle);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.addEventListener("change", restyle);

    let frame = 0;
    const startedAt = performance.now();
    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (document.hidden) return;
      const target = targetRef.current;
      if (reduceMotion) {
        current.phi = target.phi;
        current.theta = target.theta;
      } else {
        current.phi += turn(current.phi, target.phi) * 0.07;
        current.theta += (target.theta - current.theta) * 0.07;
      }
      // A slow sway, so it reads as a globe rather than a flat map.
      const sway = reduceMotion ? 0 : Math.sin((now - startedAt) / 2600) * 0.22;
      globe.update({ phi: current.phi + sway, theta: current.theta });
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      systemTheme.removeEventListener("change", restyle);
      globeRef.current = null;
      globe.destroy();
    };
  }, [size]);

  // A new timezone: move the dot and turn to face it.
  useEffect(() => {
    const { lat, lon, exact } = timeZoneCoords(timeZone);
    targetRef.current = facing(lat, lon);
    // Zones we can only place roughly (by UTC offset) get no dot.
    globeRef.current?.update({ markers: exact ? [{ location: [lat, lon], size: 0.14 }] : [] });
  }, [timeZone]);

  if (failed) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
        <GlobeIcon className="size-5" aria-hidden />
      </span>
    );
  }

  // The library wraps the canvas in an element of its own, so this box holds the size.
  return (
    <div aria-hidden className="shrink-0 animate-fade-in" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
