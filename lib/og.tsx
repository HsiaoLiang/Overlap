import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
 * Shared pieces for link previews. All fonts are vendored locally, so neither
 * a production build nor a Chinese event preview needs Google Fonts access.
 * See assets/fonts/README.md for font sources, coverage and licenses.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const mediumFont = readFile(join(process.cwd(), "assets/fonts/Geist-OG-500.ttf"));
const boldFont = readFile(join(process.cwd(), "assets/fonts/Geist-OG-700.ttf"));

/** Read the larger CJK font only for a preview that needs it. */
let cjkFont: typeof mediumFont | undefined;
export async function loadOgFonts(text: string) {
  const [medium, bold] = await Promise.all([mediumFont, boldFont]);
  const fonts = [
    { name: "Geist", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Geist", data: bold, weight: 700 as const, style: "normal" as const },
  ];
  if (/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u{20000}-\u{323af}]/u.test(text)) {
    cjkFont ??= readFile(join(process.cwd(), "assets/fonts/OverlapCJK-Regular.woff"));
    const data = await cjkFont;
    fonts.push(
      { name: "Overlap CJK", data, weight: 500, style: "normal" },
      { name: "Overlap CJK", data, weight: 700, style: "normal" },
    );
  }
  return fonts;
}

// The same values as the light theme in app/globals.css.
const colors = { canvas: "#e4e7fc", ink: "#243356", muted: "#5c6886", accent: "#f49a78" };

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
        fontFamily: "Geist, Overlap CJK",
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
