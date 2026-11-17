"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUpRight, Asterisk, Check, MoveHorizontal, RotateCcw, Sparkles, X } from "lucide-react";
import { CreateEventForm } from "@/components/create/create-event-form";
import { RecentEvents } from "@/components/recent-events";
import { setSkyBase, setSkyHover, setSkyTimeZone } from "@/components/sky";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import { useRecentEvents } from "@/hooks/use-recent-events";
import { useStageTimeZone } from "@/hooks/use-stage-time-zone";
import { nearestCity } from "@/lib/timezone-coords";
import { timeZoneCity } from "@/lib/time";
import { clockMinutes, worldClock, worldDate, worldInstant } from "@/lib/world-time";

const Globe = dynamic(() => import("@/components/globe"), { ssr: false, loading: () => <div className="planet-loading" aria-hidden /> });
const CITIES = [
  { zone: "America/New_York", name: "New York", label: "01", position: "west" },
  { zone: "Europe/London", name: "London", label: "02", position: "north" },
  { zone: "Asia/Taipei", name: "Taipei", label: "03", position: "east" },
];

/** A spatial world-clock that folds directly into the real event-creation flow. */
export function Observatory() {
  const browserZone = useBrowserTimeZone();
  const stageZone = useStageTimeZone();
  const recent = useRecentEvents();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [spunZone, setSpunZone] = useState<string | null>(null);
  const [travelMinute, setTravelMinute] = useState<number | null>(17 * 60);
  const [travelZone, setTravelZone] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const completedRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const baseZone = selectedZone ?? browserZone ?? "Europe/London";
  const shownZone = (creating ? stageZone : null) ?? spunZone ?? baseZone;
  const instant = now === null ? null : worldInstant(now, travelZone ?? browserZone ?? "Europe/London", travelMinute);
  const currentMinute = instant === null ? 17 * 60 : clockMinutes(instant, shownZone);
  const skyName = currentMinute < 5 * 60 || currentMinute >= 21 * 60 ? "Midnight blue" : currentMinute < 8 * 60 ? "First light" : currentMinute < 16 * 60 ? "Daydream" : currentMinute < 19 * 60 ? "Golden hour" : "Afterglow";

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setSkyTimeZone(shownZone);
    setSkyBase(instant === null ? 17 * 60 : clockMinutes(instant, shownZone));
    return () => { setSkyBase(null); setSkyTimeZone(null); setSkyHover(null); };
  }, [instant, shownZone]);

  const begin = useCallback(() => {
    if (completedRef.current) {
      completedRef.current = false;
      setFormVersion(version => version + 1);
    }
    setCreating(true);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, []);
  useEffect(() => {
    const fromHash = () => {
      if (window.location.hash === "#create-event") {
        begin();
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    window.addEventListener("overlap:create", begin);
    const dialog = dialogRef.current;
    return () => { window.removeEventListener("hashchange", fromHash); window.removeEventListener("overlap:create", begin); dialog?.close(); };
  }, [begin]);
  useEffect(() => {
    if (!creating) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [creating]);

  function choose(zone: string) { setSelectedZone(zone); setSpunZone(null); }
  function scrub(value: number) { setTravelZone(shownZone); setTravelMinute(value); }

  return (
    <main className="observatory" data-creating={creating}>
      <div className="observatory-grain" aria-hidden />
      <div className="observatory-intro"><span className="scene-dot" /> FOR YOUR PEOPLE, WHEREVER THEY ARE.</div>
      <h1 className="observatory-title"><span>A world apart.</span>together<span className="observatory-title-dot">.</span><span className="sr-only"> Find a time that works for everyone.</span></h1>

      <div className="observatory-orbit" aria-hidden>
        <svg viewBox="0 0 1100 600" fill="none"><ellipse cx="550" cy="300" rx="490" ry="197" transform="rotate(-14 550 300)" /><ellipse cx="550" cy="300" rx="407" ry="247" transform="rotate(17 550 300)" strokeDasharray="1 11" /><circle cx="79" cy="374" r="5" /><circle cx="1019" cy="218" r="4" /><path d="M61 374h35M79 356v35M1005 218h28M1019 204v28" /></svg>
      </div>
      <div className="observatory-planet">
        <div className="planet-aura" aria-hidden />
        <Globe appearance="celestial" timeZone={(creating ? stageZone : null) ?? baseZone} cities onFace={(longitude) => setSpunZone(longitude === null ? null : nearestCity(longitude))} />
      </div>

      <div className="observatory-city-signals" aria-label="Explore city times">
        {CITIES.map(city => (
          <button key={city.zone} type="button" className={`city-signal city-signal-${city.position}`} aria-pressed={baseZone === city.zone} onClick={() => choose(city.zone)}>
            <span className="city-signal-index">{city.label} / {city.name}</span>
            <strong>{instant === null ? "—:—" : worldClock(instant,city.zone)}<ArrowUpRight size={15} aria-hidden /></strong>
            <span className="city-signal-date">{instant === null ? "One world. Many clocks." : worldDate(instant,city.zone)}</span>
          </button>
        ))}
      </div>

      <div className="observatory-copy"><p>Different schedules. <br />A little room for everyone.</p><span>Share a link. Paint your free time.<br />Let the overlap bring you together.</span></div>
      <div className="observatory-action">
        <button type="button" className="orbit-create" onClick={begin}><span>Find our time</span><ArrowUpRight size={24} aria-hidden /></button>
        <p><Check size={12} aria-hidden /> Free. No accounts. Just a link.</p>
      </div>
      <div className="observatory-location" aria-live="polite">
        <Asterisk className="location-cross" aria-hidden />
        <div><span>{spunZone ? "Somewhere else feels a little closer." : "A different time. The same sky."}</span><strong>{timeZoneCity(shownZone)}<small>{instant === null ? "17:00" : worldClock(instant,shownZone)}</small></strong>
          {spunZone && <button type="button" onClick={() => choose(spunZone)}>Use this timezone <ArrowUpRight size={12} /></button>}
        </div>
      </div>

      <section className="observatory-time" aria-label="Explore the sky through the day">
        <div className="time-scrubber-title"><span><Sparkles size={14} aria-hidden />{skyName}</span><span>{travelMinute === null ? "LIVE" : "TIME TRAVEL"} · {timeZoneCity(shownZone)}</span></div>
        <div className="time-scrubber"><span aria-hidden>00</span><input type="range" min={0} max={1410} step={30} value={Math.min(1410,Math.round(currentMinute/30)*30)} aria-label={`Explore time in ${timeZoneCity(shownZone)}`} aria-describedby="world-time-hint" aria-valuetext={`${Math.floor(currentMinute/60).toString().padStart(2,"0")}:${(currentMinute%60).toString().padStart(2,"0")} in ${timeZoneCity(shownZone)}`} onChange={e=>scrub(Number(e.target.value))} /><span aria-hidden>24</span></div>
        <div className="time-scrubber-footer"><p id="world-time-hint">Slide through a day. Watch the world change.</p><button type="button" onClick={()=>{setTravelMinute(null);setTravelZone(null);}}><RotateCcw size={11} aria-hidden />Back to now</button></div>
      </section>

      <div className="observatory-bottom"><span><MoveHorizontal size={13} aria-hidden /> Drag the globe. Slide through time.</span>{recent.length > 0 && <details className="observatory-recent"><summary>Your events <ArrowDown size={12} aria-hidden /></summary><div><RecentEvents /></div></details>}</div>

      <dialog ref={dialogRef} className="observatory-dialog" aria-labelledby="create-dialog-title" onClose={event=>{if(event.target===event.currentTarget)setCreating(false);}} onClick={e=>{if(e.target===dialogRef.current)dialogRef.current?.close();}}>
        <div className="observatory-dialog-top"><span id="create-dialog-title"><span className="scene-dot" /> MAKE ROOM FOR SOMETHING GOOD.</span><button type="button" aria-label="Close event creation" onClick={()=>dialogRef.current?.close()}><X size={19} /></button></div>
        <CreateEventForm key={formVersion} defaultTimeZone={baseZone} onCreated={()=>{completedRef.current=true;}} />
      </dialog>
    </main>
  );
}
