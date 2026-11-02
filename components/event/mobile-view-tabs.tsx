"use client";

import { useEffect, useRef, useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";

export type MobileView = "mine" | "group";

const isField = (el: EventTarget | null) =>
  el instanceof HTMLElement && el.matches("input, select, textarea");

/**
 * Phones only: "Your availability | Group" tabs.
 *
 * The tabs sit above the panels. Once you scroll past them, a copy slides up
 * as a bar fixed to the bottom of the screen, so you can switch views from
 * anywhere (people often didn't find the Group tab after scrolling down).
 * Switching from the bottom bar also scrolls back to the top of the panel.
 */
export function MobileViewTabs({
  value,
  onChange,
  groupCount,
}: {
  value: MobileView;
  onChange: (view: MobileView) => void;
  groupCount: number;
}) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsInView, setTabsInView] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Watch whether the top tabs are on screen.
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const observer = new IntersectionObserver(([entry]) => {
      setTabsInView(entry.isIntersecting);
      // A focused field that gets removed from the page (e.g. the join form
      // after joining) never fires "focusout", so re-check here.
      setIsTyping(isField(document.activeElement));
    });
    observer.observe(tabs);
    return () => observer.disconnect();
  }, []);

  // Hide the bar while typing, so it doesn't sit on top of the phone keyboard.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => setIsTyping(isField(e.target));
    const onFocusOut = () => setIsTyping(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const options = [
    { value: "mine" as const, label: "Your availability" },
    { value: "group" as const, label: `Group (${groupCount})` },
  ];

  function switchFromBottomBar(view: MobileView) {
    onChange(view);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tabsRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <>
      <div ref={tabsRef} className="scroll-mt-4 lg:hidden">
        <SegmentedControl label="Show" value={value} onChange={onChange} options={options} />
      </div>

      {!tabsInView && !isTyping && (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-slide-up border-t border-line bg-canvas/85 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <div className="mx-auto max-w-md">
            <SegmentedControl
              label="Switch view"
              value={value}
              onChange={switchFromBottomBar}
              options={options}
            />
          </div>
        </div>
      )}
    </>
  );
}
