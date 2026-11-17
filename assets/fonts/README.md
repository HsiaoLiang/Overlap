# Local fonts

The app and its link-preview images read these files locally. Builds and Chinese
link previews do not need a Google Fonts download.

- `Bricolage-Latin.woff`: a Latin subset of the variable Bricolage Grotesque
  font, used for the observatory typography. Source: Google Fonts
  `ofl/bricolagegrotesque/BricolageGrotesque[opsz,wdth,wght].ttf`, subset with
  fontTools. The project authors' SIL Open Font License is in `Bricolage-OFL.txt`.

- `Geist-Latin.woff2` and `GeistMono-Latin.woff2`: variable Latin subsets bundled
  with Next.js 16.4.3 (`next/dist/next-devtools/server/font/`). Their SIL Open Font
  Licenses are in `Geist-OFL.txt` and `GeistMono-OFL.txt`.
- `Geist-OG-500.ttf` and `Geist-OG-700.ttf`: static instances of the same Geist
  Latin font, made with fontTools at weights 500 and 700. `next/og` supports TTF
  rather than WOFF2. These retain the Geist license.
- `OverlapCJK-Regular.woff`: a subset of the Traditional Chinese face (index 3)
  of Noto Sans CJK Regular, from Debian's `fonts-noto-cjk` package. Source:
  <https://github.com/notofonts/noto-cjk>. Copyright and the full SIL Open Font
  License are in `OFL-Noto-CJK.txt`. The modified family is named `Overlap CJK`.
  Latin characters, CJK ideographs (including the source font's supplementary
  ideographs), radicals, Bopomofo, kana and punctuation are retained. Hangul and
  advanced shaping tables are omitted. This is a Chinese preview font, not a
  promise of coverage for every language or emoji.

The CJK subset was generated with fontTools from
`/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`, face 3, with hinting and
layout features removed, keeping these Unicode ranges:

```
0020-024F, 2000-206F, 2190-2BFF, 2E80-31FF, 3400-4DBF, 4E00-9FFF,
F900-FAFF, FE10-FE6F, FF00-FFEF, 20000-323AF
```

The larger CJK font is loaded only when a preview contains those characters.
These are server assets read from disk, not client downloads.
