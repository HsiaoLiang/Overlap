"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, Check, MoveHorizontal, RotateCcw, Sparkles } from "lucide-react";
import { setSkyHover, setSkyTimeZone } from "@/components/sky";
import { useBrowserTimeZone } from "@/hooks/use-client-value";
import { useStageTimeZone } from "@/hooks/use-stage-time-zone";
import {
  DEMO_END, DEMO_OVERLAP, DEMO_PEOPLE, DEMO_START,
  demoAvailable, demoDayOffset, demoMinutes, demoTime,
} from "@/lib/moment-demo";

const percent = (minute: number) => `${((minute - DEMO_START) / (DEMO_END - DEMO_START)) * 100}%`;

/** A lightweight, keyboard-accessible introduction to the real product. */
export function SharedMoment() {
  const [minute, setMinute] = useState(12 * 60);
  const [city, setCity] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const browserZone = useBrowserTimeZone();
  const formZone = useStageTimeZone();
  const people = DEMO_PEOPLE.map((person) => ({ ...person, available: demoAvailable(person, minute) }));
  const together = people.every((person) => person.available);
  const shown = DEMO_PEOPLE[city];
  const dayOffset = demoDayOffset(minute, shown.zone);

  useEffect(() => {
    setSkyTimeZone(formZone ?? browserZone);
    return () => setSkyTimeZone(null);
  }, [formZone, browserZone]);
  useEffect(() => {
    setSkyHover(previewing ? demoMinutes(minute, shown.zone) : null);
    return () => setSkyHover(null);
  }, [minute, previewing, shown.zone]);

  function findMoment() {
    setMinute(DEMO_OVERLAP.from + 30);
    setPreviewing(true);
  }

  return (
    <div className="moment-scene" data-together={together}>
      <div className="moment-scene-top">
        <span className="moment-eyebrow"><span className="signal-dot" /> THREE CITIES. ONE MOMENT.</span>
        <span className="moment-example">Example · 18 Nov UTC</span>
      </div>
      <div className="moment-world" aria-hidden="true">
        <svg viewBox="0 0 640 300" fill="none" className="moment-orbits">
          <defs>
            <radialGradient id="world-light"><stop stopColor="#e9bd78" stopOpacity=".25" /><stop offset="1" stopColor="#e9bd78" stopOpacity="0" /></radialGradient>
            <linearGradient id="orbit-stroke"><stop stopColor="#d3b17a" stopOpacity="0" /><stop offset=".5" stopColor="#ecd5a5" stopOpacity=".65" /><stop offset="1" stopColor="#d3b17a" stopOpacity="0" /></linearGradient>
          </defs>
          <circle cx="320" cy="150" r="145" fill="url(#world-light)" />
          <g className="moment-globe-lines" stroke="#b8c5ca" strokeOpacity=".18" strokeWidth=".7">
            <circle cx="320" cy="150" r="106" />
            <ellipse cx="320" cy="150" rx="71" ry="106" />
            <ellipse cx="320" cy="150" rx="30" ry="106" />
            <ellipse cx="320" cy="150" rx="106" ry="37" />
            <path d="M229 96c49 24 133 24 182 0M229 204c49-24 133-24 182 0M214 150h212M320 44v212" />
          </g>
          <ellipse cx="320" cy="150" rx="241" ry="77" transform="rotate(-18 320 150)" stroke="url(#orbit-stroke)" />
          <ellipse cx="320" cy="150" rx="211" ry="92" transform="rotate(22 320 150)" stroke="url(#orbit-stroke)" strokeDasharray="2 8" />
          <path className="moment-connection" d="M252 106Q320 26 388 114M252 106Q280 212 352 190M388 114Q402 166 352 190" stroke="#ecc88c" strokeWidth="1.5" />
          {[[252,106],[388,114],[352,190]].map(([x,y],i) => (
            <g key={x} className={`moment-city-point moment-city-${i}`}>
              <circle cx={x} cy={y} r="12" fill="#e9bd78" fillOpacity=".08" />
              <circle cx={x} cy={y} r="3" fill="#f0cc93" />
            </g>
          ))}
          <text x="219" y="88" className="orbit-city">LONDON</text>
          <text x="395" y="102" className="orbit-city">TAIPEI</text>
          <text x="346" y="216" className="orbit-city">NEW YORK</text>
        </svg>
        <div className="moment-world-label">
          <span className="moment-world-caption">A little room for everyone.</span>
          <span className="moment-world-time">{demoTime(minute, shown.zone)}{dayOffset !== 0 && <small className="moment-date-shift">{dayOffset > 0 ? "+1 day" : "−1 day"}</small>}<span>{shown.city}</span></span>
        </div>
      </div>

      <div className="moment-timeline">
        <div className="moment-timeline-ruler" aria-hidden="true"><span>08:00</span><span>12:00</span><span>16:00</span><span>18:00 UTC</span></div>
        <div className="moment-tracks" style={{ "--moment-position": percent(minute), "--moment-fraction": (minute - DEMO_START) / (DEMO_END - DEMO_START) } as CSSProperties}>
          <div className="moment-common" aria-hidden="true" />
          <div className="moment-playhead" aria-hidden="true"><span /></div>
          {people.map((person, i) => (
            <div className="moment-person" key={person.zone} data-available={person.available}>
              <button type="button" className="moment-person-label" aria-pressed={city === i} aria-label={`Preview ${person.city} time`} aria-describedby={`moment-person-${i}`}
                onClick={() => { setCity(i); setPreviewing(true); }}>
                <span className="moment-avatar">{person.initials}</span>
                <span><strong>{person.name}</strong><span>{person.city}{demoDayOffset(minute, person.zone) > 0 ? " · +1d" : ""}</span></span>
              </button>
              <div className="moment-track" aria-hidden="true">
                <div className="moment-free" style={{ left: percent(person.from), width: `${((Math.min(person.to, DEMO_END) - person.from) / (DEMO_END - DEMO_START)) * 100}%` }} />
                <span className="moment-track-time">{demoTime(minute, person.zone)}</span>
              </div>
              <span className="moment-person-status" aria-hidden="true">
                {person.available ? <Check size={13} aria-hidden="true" /> : <span>—</span>}
              </span>
              <span id={`moment-person-${i}`} className="sr-only">{person.name} · {demoTime(minute, person.zone)}{demoDayOffset(minute,person.zone) > 0 ? ", next day" : ""} · {person.available ? "available" : "unavailable"}</span>
            </div>
          ))}
        </div>
        <label className="moment-slider-label" htmlFor="moment-slider"><MoveHorizontal size={14} aria-hidden="true" /> Slide to find a shared moment</label>
        <input id="moment-slider" className="moment-slider" type="range" min={DEMO_START} max={DEMO_END} step={30} value={minute}
          aria-label="Example time in UTC" aria-valuetext={`${demoTime(minute, "UTC")} UTC. ${people.filter(p => p.available).length} of 3 people available.`}
          onChange={(e) => { setMinute(Number(e.target.value)); setPreviewing(true); }} />
      </div>
      <div className="moment-result">
        <div className="moment-result-copy" role="status" aria-live="polite" aria-atomic="true">
          <span className="moment-result-icon">{together ? <Check size={17} /> : <Sparkles size={17} />}</span>
          <span><strong>{together ? "A shared moment, found." : "Different days. A little common ground."}</strong>
            <span>{together ? `London ${demoTime(minute,"Europe/London")} · New York ${demoTime(minute,"America/New_York")} · Taipei ${demoTime(minute,"Asia/Taipei")}` : `${people.filter(p => p.available).length} of 3 are free. Keep exploring.`}</span>
          </span>
        </div>
        {together ? <a href="#create-event" className="moment-action">Make it yours <ArrowUpRight size={15} /></a> : <button type="button" className="moment-action" onClick={findMoment}>Find the overlap <ArrowUpRight size={15} /></button>}
      </div>
      <div className="moment-preview-note">
        <span>{previewing ? `Sky preview · ${demoTime(minute,shown.zone)}${dayOffset > 0 ? " (+1 day)" : ""} in ${shown.city}` : "An interactive example. Your event is your own."}</span>
        {previewing ? <button type="button" onClick={() => setPreviewing(false)}><RotateCcw size={11} /> Your sky</button> : <ArrowDown size={12} aria-hidden="true" />}
      </div>
    </div>
  );
}
