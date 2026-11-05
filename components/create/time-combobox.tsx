"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { minutesToLabel, parseTimeInput } from "@/lib/time";

/**
 * A time box you can type into ("930", "21:30", "9pm") or pick from a list
 * of half hours. Typed times are rounded to the nearest half hour; anything
 * that isn't a valid choice shows a short message and keeps the old value.
 *
 * Keyboard: ↑/↓ move through the list, Enter picks, Esc cancels.
 */
export function TimeCombobox({
  id,
  label,
  value,
  options,
  isDisabled = () => false,
  disabledMessage,
  onChange,
}: {
  id: string;
  label: string;
  /** Minutes after midnight. */
  value: number;
  /** Allowed values, in order. */
  options: number[];
  isDisabled?: (minutes: number) => boolean;
  /** Shown when someone types a time that's in the list but disabled. */
  disabledMessage?: (minutes: number) => string;
  onChange: (minutes: number) => void;
}) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null); // null = showing `value`
  // On some phones, tapping a list option blurs the input first. We wait a
  // moment before acting on blur so the tap on the option still lands.
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = options.filter((m) => !isDisabled(m));

  /** Apply a choice, or explain why not (naming what was typed) and keep the old value. */
  function commit(minutes: number | null, typed?: string) {
    clearTimeout(blurTimer.current);
    setText(null);
    setOpen(false);
    if (minutes === null) {
      setError(`“${typed ?? ""}” isn't a time. Try 9:30 or 2130.`);
    } else if (!options.includes(minutes)) {
      setError(
        `${minutesToLabel(minutes)} isn't available. Choose ${minutesToLabel(options[0])}–${minutesToLabel(options.at(-1)!)}.`,
      );
    } else if (isDisabled(minutes)) {
      setError(disabledMessage?.(minutes) ?? `${minutesToLabel(minutes)} isn't available.`);
    } else {
      setError(null);
      onChange(minutes);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const index = enabled.indexOf(active ?? value);
      const next = e.key === "ArrowDown" ? index + 1 : index - 1;
      setActive(enabled[Math.min(Math.max(next, 0), enabled.length - 1)]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(text === null ? (active ?? value) : (active ?? parseTimeInput(text)), text ?? undefined);
    } else if (e.key === "Escape") {
      setText(null);
      setOpen(false);
    }
  }

  // Keep the highlighted option visible inside the list.
  useEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>('[data-active="true"]');
    if (list && option) list.scrollTop = option.offsetTop - list.clientHeight / 2 + option.clientHeight / 2;
  }, [open, active]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active !== null ? `${listId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        inputMode="numeric"
        autoComplete="off"
        value={text ?? minutesToLabel(value)}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
          setActive(value);
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          const parsed = parseTimeInput(e.target.value);
          setActive(parsed !== null && enabled.includes(parsed) ? parsed : null);
        }}
        onBlur={() => {
          const typed = text; // what was in the box when focus left
          blurTimer.current = setTimeout(() => {
            if (typed !== null) commit(parseTimeInput(typed), typed);
            else setOpen(false);
          }, 150);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-11 w-full rounded-lg border bg-surface pr-9 pl-3 text-base text-ink tabular-nums shadow-sm transition-colors sm:text-sm",
          "hover:border-line-strong focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none",
          error ? "border-danger" : "border-line",
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Show ${label.toLowerCase()} options`}
        onMouseDown={(e) => e.preventDefault()} // keep focus in the input
        onClick={() => {
          setOpen((o) => !o);
          setActive(value);
          inputRef.current?.focus();
        }}
        className="absolute top-0 right-0 flex h-11 w-9 items-center justify-center text-muted"
      >
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-60 w-full animate-fade-in overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg"
        >
          {options.map((m) => {
            const disabled = isDisabled(m);
            const selected = m === value;
            return (
              <li
                key={m}
                id={`${listId}-${m}`}
                role="option"
                aria-selected={selected}
                aria-disabled={disabled || undefined}
                data-active={m === active}
                onMouseDown={(e) => e.preventDefault()} // don't blur the input first
                onClick={() => !disabled && commit(m)}
                onMouseEnter={() => !disabled && setActive(m)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-sm tabular-nums",
                  disabled && "cursor-default text-muted/50",
                  !disabled && m === active && "bg-subtle",
                  selected && "font-medium text-accent-ink",
                )}
              >
                {minutesToLabel(m)}
                {selected && <Check className="size-4" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
