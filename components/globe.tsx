"use client";

import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from "react";
import createGlobe, { type Arc, type Marker } from "cobe";
import { Globe as GlobeIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { CITY_COORDS, timeZoneCoords } from "@/lib/timezone-coords";

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
  const ink = rgb(css.getPropertyValue("--accent"), isDark ? [1, 1, 1] : [0.1, 0.1, 0.1]);
  return {
    dark: isDark ? 1 : 0,
    baseColor: isDark ? ([0.5, 0.5, 0.56] as RGB) : ([1, 1, 1] as RGB),
    glowColor: isDark ? ([0.16, 0.17, 0.22] as RGB) : ([1, 1, 1] as RGB),
    markerColor: ink,
    arcColor: ink,
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

/** The longitude facing us when the globe is turned to `phi`: -180…180. */
function longitudeAt(phi: number) {
  const degrees = ((1.5 * Math.PI - phi) * 180) / Math.PI;
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

/** The shortest way round from one angle to another. */
function turn(from: number, to: number) {
  const full = Math.PI * 2;
  return ((((to - from) % full) + full + Math.PI) % full) - Math.PI;
}

/** A handful of cities around the world, linked to the one the globe is about. */
const HUBS = [
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Sao_Paulo",
];

function cityMarkers(home: [number, number] | null): { markers: Marker[]; arcs: Arc[] } {
  const hubs = HUBS.map((id) => CITY_COORDS[id]).filter(
    // Not the home city itself, or one right next to it.
    (hub) => !home || Math.abs(hub[0] - home[0]) + Math.abs(hub[1] - home[1]) > 8,
  );
  return {
    markers: [
      ...hubs.map((location) => ({ location, size: 0.028 })),
      ...(home ? [{ location: home, size: 0.07 }] : []),
    ],
    arcs: home ? hubs.map((to) => ({ from: home, to })) : [],
  };
}

const HOLD_MS = 2600; // after letting go, how long the globe stays where you left it

/**
 * A dotted globe that turns to face a timezone, with a dot on its city.
 *
 * - `size`: a fixed size in pixels. Leave it out and the globe fills its
 *   parent's width.
 * - `cities`: also dot the world's big cities and draw arcs to them.
 * - `onFace`: makes the globe spinnable by dragging. Called with the longitude
 *   facing you while it's been spun by hand, then with null once it turns back.
 *
 * Decorative: whatever it shows is also written in text next to it.
 */
export default function Globe({
  timeZone,
  size,
  cities = false,
  onFace,
  className,
}: {
  timeZone: string;
  size?: number;
  cities?: boolean;
  onFace?: (longitude: number | null) => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const targetRef = useRef(facing(0, 0));
  // Spinning by hand: where the drag started, and when the globe was last let go.
  const dragRef = useRef<{ x: number; phi: number } | null>(null);
  const spunRef = useRef<{ phi: number; releasedAt: number | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const spinnable = onFace !== undefined;
  const reportFace = useEffectEvent((longitude: number | null) => onFace?.(longitude));

  // Start the globe once, then keep easing it towards wherever it should face.
  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;

    // The library draws nothing (silently) without WebGL: check first, on a spare canvas.
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
      queueMicrotask(() => setFailed(true));
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const current = { ...targetRef.current };
    const width = size ?? box.clientWidth;

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width,
      height: width,
      phi: current.phi,
      theta: current.theta,
      diffuse: 1.2,
      mapSamples: size ? 9000 : 20000,
      markerElevation: 0.02,
      arcWidth: 0.5,
      arcHeight: 0.22,
      ...readTheme(),
    });
    globeRef.current = globe;

    // Follow the theme toggle and the system's light/dark setting.
    const restyle = () => globe.update(readTheme());
    const themeObserver = new MutationObserver(restyle);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.addEventListener("change", restyle);

    // A globe that fills its parent is redrawn at the parent's new size.
    const resizeObserver = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (!size && next > 0) globe.update({ width: next, height: next });
    });
    resizeObserver.observe(box);

    // Don't draw while it's scrolled out of view.
    let visible = true;
    const viewObserver = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    viewObserver.observe(box);

    let frame = 0;
    let lastFace: number | null = null;
    const startedAt = performance.now();
    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (document.hidden || !visible) return;
      const target = targetRef.current;
      const spun = spunRef.current;

      if (spun && (spun.releasedAt === null || now - spun.releasedAt < HOLD_MS)) {
        // Held, or just let go: stay where the hand put it.
        current.phi += turn(current.phi, spun.phi) * 0.25;
        const face = Math.round(longitudeAt(current.phi));
        if (face !== lastFace) reportFace((lastFace = face));
      } else {
        if (spun) {
          spunRef.current = null;
          reportFace((lastFace = null));
        }
        const ease = reduceMotion ? 1 : 0.07;
        current.phi += turn(current.phi, target.phi) * ease;
        current.theta += (target.theta - current.theta) * ease;
      }

      // A slow sway, so it reads as a globe rather than a flat map.
      const sway = reduceMotion || spun ? 0 : Math.sin((now - startedAt) / 2600) * 0.2;
      globe.update({ phi: current.phi + sway, theta: current.theta });
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      viewObserver.disconnect();
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
    const home: [number, number] | null = exact ? [lat, lon] : null;
    globeRef.current?.update(
      cities
        ? cityMarkers(home)
        : { markers: home ? [{ location: home, size: 0.14 }] : [], arcs: [] },
    );
  }, [timeZone, cities]);

  function release() {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (spunRef.current) spunRef.current.releasedAt = performance.now();
    setGrabbing(false);
  }

  // Dragging sideways spins the globe. Up and down still scrolls the page.
  const spin = spinnable
    ? {
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const phi = spunRef.current?.phi ?? targetRef.current.phi;
          dragRef.current = { x: e.clientX, phi };
          spunRef.current = { phi, releasedAt: null };
          setGrabbing(true);
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
          const drag = dragRef.current;
          if (!drag) return;
          // The sphere's radius is about 0.4 of the box: move with the finger.
          const radius = e.currentTarget.clientWidth * 0.4;
          spunRef.current = { phi: drag.phi + (e.clientX - drag.x) / radius, releasedAt: null };
        },
        onPointerUp: release,
        onPointerCancel: release,
      }
    : {};

  const box = size ? { width: size, height: size } : undefined;

  if (failed) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", !size && "aspect-square w-full", className)}
        style={box}
      >
        <GlobeIcon className={size ? "size-5" : "size-16 opacity-60"} aria-hidden />
      </span>
    );
  }

  // The library wraps the canvas in an element of its own, so this box holds the size.
  return (
    <div
      ref={boxRef}
      aria-hidden
      {...spin}
      className={cn(
        "shrink-0 animate-fade-in",
        !size && "aspect-square w-full",
        spinnable && (grabbing ? "cursor-grabbing" : "cursor-grab"),
        spinnable && "touch-pan-y select-none",
        className,
      )}
      style={box}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
