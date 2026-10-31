"use client";

import type { ComponentProps } from "react";
import { Select } from "@/components/ui/field";
import { useClientValue } from "@/hooks/use-client-value";
import { timeZoneOffsetLabel } from "@/lib/time";

type Option = { value: string; label: string };
let cachedOptions: Option[] | null = null;

/** All IANA timezones the browser knows, labelled like "Asia/Taipei (GMT+8)". */
function getTimeZoneOptions() {
  cachedOptions ??= Intl.supportedValuesOf("timeZone").map((tz) => ({
    value: tz,
    label: `${tz.replaceAll("_", " ")} (${timeZoneOffsetLabel(tz)})`,
  }));
  return cachedOptions;
}

export function TimezoneSelect({
  value,
  onChange,
  ...props
}: { value: string; onChange: (tz: string) => void } & Omit<
  ComponentProps<"select">,
  "value" | "onChange"
>) {
  // The list is built in the browser only (server and browser lists can differ).
  const options = useClientValue(getTimeZoneOptions) ?? [];
  const hasValue = options.some((o) => o.value === value);

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {!hasValue && <option value={value}>{value.replaceAll("_", " ")}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
