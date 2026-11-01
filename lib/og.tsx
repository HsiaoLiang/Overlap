import "server-only";
import { cacheLife } from "next/cache";

/*
 * Shared pieces for the link-preview images (the card you see when a link is
 * pasted into LINE, Slack, iMessage…). Rendered by next/og at request time.
 */

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Download one weight of Noto Sans TC from Google Fonts, trimmed to just the
 * characters we draw. Cached ("use cache"), so the home image can be built
 * ahead of time and each event's image only downloads its font once.
 */
async function fetchNotoSansTC(weight: number, text: string) {
  "use cache";
  cacheLife("max");
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(cssUrl)).text();
  const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!fontUrl) throw new Error("Font URL not found");
  return (await fetch(fontUrl)).arrayBuffer();
}

/**
 * Fonts for the preview images. The default font has no Chinese characters,
 * and event names often do. If the download fails we fall back to the
 * default font rather than erroring (and the failure isn't cached).
 */
export async function loadOgFonts(text: string) {
  try {
    const [medium, bold] = await Promise.all([
      fetchNotoSansTC(500, text),
      fetchNotoSansTC(700, text),
    ]);
    return [
      { name: "Noto Sans TC", data: medium, weight: 500 as const, style: "normal" as const },
      { name: "Noto Sans TC", data: bold, weight: 700 as const, style: "normal" as const },
    ];
  } catch (error) {
    console.error("loadOgFonts failed, using the default font", error);
    return [];
  }
}

// The same values as the light theme in app/globals.css.
const colors = { canvas: "#fafafa", ink: "#18181b", muted: "#71717a", accent: "#6e56cf" };

/** The preview card layout: brand, big title, subtitle, and a mini heatmap. */
export function OgCard({ title, subtitle }: { title: string; subtitle: string }) {
  const heat = [
    [0, 1, 1, 0, 2],
    [1, 2, 3, 1, 2],
    [2, 4, 4, 2, 3],
    [1, 3, 4, 3, 1],
    [0, 1, 2, 2, 0],
  ];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: colors.canvas,
        padding: 72,
        fontFamily: "Noto Sans TC",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <circle cx="12" cy="16" r="9" fill={colors.accent} opacity="0.35" />
            <circle cx="20" cy="16" r="9" fill={colors.accent} opacity="0.35" />
            <path d="M16 8.5a9 9 0 0 1 0 15a9 9 0 0 1 0-15z" fill={colors.accent} />
          </svg>
          <span style={{ fontSize: 32, fontWeight: 700, color: colors.ink }}>Overlap</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: title.length > 40 ? 56 : 72,
            fontWeight: 700,
            lineHeight: 1.1,
            color: colors.ink,
            letterSpacing: -1.5,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 30, fontWeight: 500, color: colors.muted }}>
          {subtitle}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
        {heat.map((row, r) => (
          <div key={r} style={{ display: "flex", gap: 10 }}>
            {row.map((count, c) => (
              <div
                key={c}
                style={{
                  width: 56,
                  height: 36,
                  borderRadius: 8,
                  background: colors.accent,
                  opacity: count === 0 ? 0.08 : 0.2 + count * 0.2,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
