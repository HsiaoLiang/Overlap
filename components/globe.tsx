"use client";

import { useEffect, useEffectEvent, useId, useRef, useState, type PointerEvent } from "react";
import createGlobe, { type Arc, type COBEOptions, type Marker } from "cobe";
import { cn } from "@/lib/cn";
import { CITY_COORDS, timeZoneCoords } from "@/lib/timezone-coords";

type RGB = [number, number, number];

/** "#6e56cf" → [0.43, 0.34, 0.81] (what the globe's shader wants). */
function rgb(hex: string, fallback: RGB): RGB {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return match ? (match.slice(1).map((v) => parseInt(v, 16) / 255) as RGB) : fallback;
}

/** The globe's colours, read from the design tokens so it follows the theme. */
function readTheme(appearance: "theme" | "celestial") {
  if (appearance === "celestial") {
    return {
      dark: 0,
      baseColor: [0.82, 0.9, 1] as RGB,
      glowColor: [0.33, 0.45, 0.68] as RGB,
      markerColor: [0.96, 0.49, 0.48] as RGB,
      arcColor: [0.61, 0.71, 0.94] as RGB,
      mapBrightness: 0.9,
      mapBaseBrightness: 0.02,
      opacity: 0.9,
    };
  }
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
    mapBaseBrightness: 0,
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

const CELESTIAL_HUBS = ["Europe/London", "America/New_York", "Asia/Taipei"];

function cityMarkers(home: [number, number] | null, celestial = false): { markers: Marker[]; arcs: Arc[] } {
  const hubs = (celestial ? CELESTIAL_HUBS : HUBS).map((id) => CITY_COORDS[id]).filter(
    // Not the home city itself, or one right next to it.
    (hub) => !home || Math.abs(hub[0] - home[0]) + Math.abs(hub[1] - home[1]) > 8,
  );
  return {
    markers: [
      ...hubs.map((location) => ({ location, size: celestial ? 0.023 : 0.028 })),
      ...(home ? [{ location: home, size: celestial ? 0.045 : 0.07 }] : []),
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
  appearance = "theme",
  onFace,
  className,
}: {
  timeZone: string;
  size?: number;
  cities?: boolean;
  /** Fixed luminous colours for a photographic sky; otherwise follows the app theme. */
  appearance?: "theme" | "celestial";
  onFace?: (longitude: number | null) => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(facing(0, 0));
  const currentRef = useRef(facing(0, 0));
  const wakeRef = useRef<() => void>(() => {});
  const pendingRef = useRef<Partial<COBEOptions>>({});
  const markersRef = useRef<{ markers: Marker[]; arcs: Arc[] }>({ markers: [], arcs: [] });
  const dragRef = useRef<{ x: number; phi: number } | null>(null);
  const spunRef = useRef<{ phi: number; releasedAt: number | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const fallbackId = useId().replaceAll(":", "");
  const spinnable = onFace !== undefined;
  const reportFace = useEffectEvent((longitude: number | null) => onFace?.(longitude));

  // Cobe draws only when updated. Wake it for a change, and stop scheduling
  // frames once it settles; a static globe has no animation loop at all.
  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (failed || !box || !canvas) return;
    let disposed = false;
    const fail = () => {
      if (!disposed) setFailed(true);
    };

    // Detect unavailable WebGL before Cobe can silently return a blank canvas.
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!context) {
      queueMicrotask(fail);
      return;
    }
    context.getExtension("WEBGL_lose_context")?.loseContext();

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const current = currentRef.current;
    const width = Math.max(1, size ?? box.clientWidth);
    let globe: ReturnType<typeof createGlobe>;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, width > 400 ? 1.5 : 2),
        width,
        height: width,
        phi: current.phi,
        theta: current.theta,
        diffuse: 1.2,
        mapSamples: appearance === "celestial" ? 12000 : size ? 9000 : 20000,
        markerElevation: 0.025,
        arcWidth: appearance === "celestial" ? 0.4 : 0.5,
        arcHeight: appearance === "celestial" ? 0.15 : 0.22,
        ...markersRef.current,
        ...readTheme(appearance),
      });
    } catch {
      queueMicrotask(fail);
      return;
    }

    let visible = false;
    let frame = 0;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let lastFace: number | null = null;
    let previousTick = 0;
    // Cobe's embedded map texture is decoded asynchronously on first load.
    // A short initial redraw window lets it appear even with reduced motion.
    const warmupUntil = performance.now() + 200;
    const epsilon = 0.0008;

    function wake() {
      if (disposed || frame || !visible || document.hidden) return;
      previousTick = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function tick(now: number) {
      frame = 0;
      if (disposed || document.hidden || !visible) return;
      const delta = Math.min(64, Math.max(1, now - previousTick));
      previousTick = now;
      const target = targetRef.current;
      const spun = spunRef.current;
      const held = spun && (spun.releasedAt === null || now - spun.releasedAt < HOLD_MS);
      const destination = held ? { phi: spun.phi, theta: current.theta } : target;

      if (!held && spun) {
        spunRef.current = null;
        reportFace((lastFace = null));
      }
      const ease = motion.matches ? 1 : 1 - Math.exp(-delta / (held ? 45 : 150));
      const phiDistance = turn(current.phi, destination.phi);
      const thetaDistance = destination.theta - current.theta;
      current.phi += phiDistance * ease;
      current.theta += thetaDistance * ease;
      const moving = Math.abs(turn(current.phi, destination.phi)) > epsilon
        || Math.abs(destination.theta - current.theta) > epsilon;
      if (!moving) {
        current.phi = destination.phi;
        current.theta = destination.theta;
      }
      if (held) {
        const face = Math.round(longitudeAt(current.phi));
        if (face !== lastFace) reportFace((lastFace = face));
        if (spun.releasedAt !== null && holdTimer === undefined) {
          holdTimer = setTimeout(() => {
            holdTimer = undefined;
            wake();
          }, Math.max(1, HOLD_MS - (now - spun.releasedAt)));
        }
      }

      globe.update({ ...pendingRef.current, phi: current.phi, theta: current.theta });
      pendingRef.current = {};
      if (moving || now < warmupUntil) frame = requestAnimationFrame(tick);
    }
    wakeRef.current = wake;

    const restyle = () => {
      pendingRef.current = { ...pendingRef.current, ...readTheme(appearance) };
      wake();
    };
    const themeObserver = new MutationObserver(restyle);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.addEventListener("change", restyle);
    motion.addEventListener("change", wake);

    const resizeObserver = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (!size && next > 0) {
        pendingRef.current = { ...pendingRef.current, width: next, height: next };
        wake();
      }
    });
    resizeObserver.observe(box);

    function suspend() {
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(holdTimer);
      holdTimer = undefined;
    }
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else suspend();
    });
    viewObserver.observe(box);
    const onVisibility = () => {
      if (document.hidden) suspend();
      else wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      fail();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      disposed = true;
      suspend();
      wakeRef.current = () => {};
      themeObserver.disconnect();
      resizeObserver.disconnect();
      viewObserver.disconnect();
      systemTheme.removeEventListener("change", restyle);
      motion.removeEventListener("change", wake);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      globe.destroy();
      // Cobe wraps the canvas. Restore React's original DOM before a remount
      // (including development Strict Mode), rather than nesting wrappers.
      const wrapper = canvas.parentElement;
      if (wrapper && wrapper !== box) {
        box.insertBefore(canvas, wrapper);
        wrapper.remove();
      }
    };
  }, [size, appearance, failed]);

  // Updates made while hidden are queued, then painted together on return.
  useEffect(() => {
    const { lat, lon, exact } = timeZoneCoords(timeZone);
    targetRef.current = facing(lat, lon);
    spunRef.current = null;
    dragRef.current = null;
    reportFace(null);
    const home: [number, number] | null = exact ? [lat, lon] : null;
    markersRef.current = cities
      ? cityMarkers(home, appearance === "celestial")
      : { markers: home ? [{ location: home, size: 0.14 }] : [], arcs: [] };
    pendingRef.current = { ...pendingRef.current, ...markersRef.current };
    wakeRef.current();
  }, [timeZone, cities, appearance]);

  function release() {
    setGrabbing(false);
    if (!dragRef.current) return;
    dragRef.current = null;
    if (spunRef.current) spunRef.current.releasedAt = performance.now();
    wakeRef.current();
  }

  const spin = spinnable
    ? {
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const phi = currentRef.current.phi;
          dragRef.current = { x: e.clientX, phi };
          spunRef.current = { phi, releasedAt: null };
          setGrabbing(true);
          wakeRef.current();
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
          const drag = dragRef.current;
          if (!drag) return;
          const radius = Math.max(1, e.currentTarget.clientWidth * 0.4);
          spunRef.current = { phi: drag.phi + (e.clientX - drag.x) / radius, releasedAt: null };
          wakeRef.current();
        },
        onPointerUp: release,
        onPointerCancel: release,
        onLostPointerCapture: release,
      }
    : {};

  const box = size ? { width: size, height: size } : undefined;
  if (failed) {
    return (
      <span
        role="img"
        aria-label={`World view for ${timeZone.replaceAll("_", " ")}. Use the timezone controls to explore.`}
        className={cn("inline-flex shrink-0 items-center justify-center", !size && "aspect-square w-full", className)}
        style={box}
      >
        <svg aria-hidden viewBox="0 0 320 320" className="size-full">
          <defs>
            <radialGradient id={`${fallbackId}-surface`} cx="32%" cy="25%" r="85%">
              <stop stopColor={appearance === "celestial" ? "#e1edfb" : "#355e7d"} />
              <stop offset="0.72" stopColor={appearance === "celestial" ? "#b9cbe8" : "#10293e"} />
              <stop offset="1" stopColor={appearance === "celestial" ? "#8da6d4" : "#071421"} />
            </radialGradient>
            <radialGradient id={`${fallbackId}-atmosphere`}>
              <stop offset="0.75" stopColor="#b2dfff" stopOpacity="0" />
              <stop offset="0.82" stopColor="#8acfff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#8acfff" stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${fallbackId}-clip`}><circle cx="160" cy="160" r="126" /></clipPath>
          </defs>
          <circle cx="160" cy="160" r="155" fill={`url(#${fallbackId}-atmosphere)`} />
          <circle cx="160" cy="160" r="126" fill={`url(#${fallbackId}-surface)`} stroke="#badfff" strokeOpacity="0.25" />
          <g clipPath={`url(#${fallbackId}-clip)`} fill="none" stroke="#b5ddf6" strokeWidth="0.65" strokeOpacity="0.2">
            <ellipse cx="160" cy="160" rx="45" ry="126" />
            <ellipse cx="160" cy="160" rx="92" ry="126" />
            <ellipse cx="160" cy="160" rx="126" ry="43" />
            <ellipse cx="160" cy="160" rx="126" ry="86" />
            <path d="M34 160h252M160 34v252" />
          </g>
          <g clipPath={`url(#${fallbackId}-clip)`} fill={appearance === "celestial" ? "#849aca" : "#c0dced"} fillOpacity="0.65">
            <path d="m100 70 24-14 25 6 10 18 23 2 9 15 23 6 16 22-7 14 11 23-10 13-19-8-9 13-15-3-6-25-20-8-9-22-21 3-10-14-19-1-11-17z" />
            <path d="m142 151 19 3 13 20-3 21-15 25-13-14-7-27zM213 219l26-7 22 18-11 20-30-3-13-14zM102 43l16-8 11 7-4 15-19 2z" />
          </g>
          <g fill="none" stroke="#c3e4fa" strokeOpacity="0.7" strokeWidth="1">
            <path d="M166 146Q121 78 89 126M166 146q37-77 74-28M166 146q58 25 69 87" />
          </g>
          <g fill={appearance === "celestial" ? "#f47d82" : "#f6cf96"}>
            <circle cx="166" cy="146" r="4" /><circle cx="89" cy="126" r="2.5" />
            <circle cx="240" cy="118" r="2.5" /><circle cx="235" cy="233" r="2.5" />
          </g>
        </svg>
      </span>
    );
  }

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
