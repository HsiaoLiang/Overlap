"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/slug";
import { isISODate, isValidTimeZone, WEEKDAY_CODES } from "@/lib/time";
import type { Weekday } from "@/lib/types";

/*
 * Server Actions: the only code that writes to the database.
 * They run on the server, so we validate every input here — never trust the
 * browser, even though our own form already validates.
 */

const createEventSchema = z
  .object({
    name: z.string().trim().min(1, "Give your event a name.").max(100, "That name is too long."),
    dateMode: z.enum(["dates", "weekdays"]),
    days: z.array(z.string()).min(1, "Pick at least one day.").max(31, "Pick 31 days or fewer."),
    startMinute: z.number().int().min(0).max(1410).multipleOf(30),
    endMinute: z.number().int().min(30).max(1440).multipleOf(30),
    timezone: z.string().refine(isValidTimeZone, "Unknown timezone."),
  })
  .refine((e) => e.startMinute < e.endMinute, "The end time must be after the start time.")
  .refine(
    (e) =>
      e.dateMode === "dates"
        ? e.days.every(isISODate)
        : e.days.every((d) => WEEKDAY_CODES.includes(d as Weekday)),
    "Some of the selected days aren't valid.",
  );

export type CreateEventInput = z.input<typeof createEventSchema>;

export async function createEvent(input: CreateEventInput): Promise<{ error: string }> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Something's not right with the form." };
  }
  const { name, dateMode, days, startMinute, endMinute, timezone } = parsed.data;

  // Store days de-duplicated and in order, so every reader can rely on that.
  const sortedDays =
    dateMode === "dates"
      ? [...new Set(days)].sort()
      : WEEKDAY_CODES.filter((code) => days.includes(code));

  const supabase = createServerClient();

  // A random slug can (very rarely) collide with an existing one. The unique
  // constraint catches that (Postgres error 23505), and we just try again.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug();
    const { error } = await supabase.from("events").insert({
      slug,
      name,
      date_mode: dateMode,
      days: sortedDays,
      start_minute: startMinute,
      end_minute: endMinute,
      timezone,
    });

    if (!error) redirect(`/e/${slug}`);
    if (error.code !== "23505") {
      console.error("createEvent failed", error);
      break;
    }
  }

  return { error: "We couldn't create your event. Please try again." };
}
