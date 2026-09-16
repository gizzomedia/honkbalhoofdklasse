# Hoofdklasse Franchise — 0.6.2

The original Swift simulation and management screen bodies run in WebAssembly.
`Native/` holds the maintained Swift source (the original 0.6.1 reference is archived). `scripts/generate-franchise.py` replaces only
platform primitives and I/O, producing `Generated/`. `Adapter/Platform.swift`
records drawing commands and supplies a lossless string save store. The browser
worker runs Swift; Canvas2D paints the original 1600×900 layout with the original
fonts, photos and logos. React is only the account entrance to the game.

## Run

```
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open `/franchise` for accounts, or `/franchise/game.html` for the game. Supabase
URL and anon key belong in `.env.local`. No service-role key is used for career
storage. Existing website administration may require its existing server key.
The bundled release WebAssembly binary means Vercel needs no Swift installation.

## Rebuild the engine

Use the official **Swift 6.4 release** and its matching WebAssembly SDK. Set
`SWIFT_COMPILER` to `swiftc` and `SWIFT_WASM_SDK` to the SDK directory containing
`WASI.sdk` and `swift.xctoolchain` (wasm32-unknown-wasip1), then run:

```
npm run franchise:build
```

For the test-only fixture/capture API set `FRANCHISE_TEST_BUILD=1` and
`FRANCHISE_OUTPUT=/absolute/path/to/test.wasm`. Do not deploy that test binary.
`FRANCHISE_WASM=/absolute/path/to/test.wasm node scripts/test-franchise-wasm.mjs`
exports the deterministic fixtures for comparison with the frozen desktop
reference. Python compares integers losslessly (JS Number cannot preserve UInt64).

## Persistence and accounts

- Three slots, raw JSON strings; Swift validates import and save.
- IndexedDB local save and previous-save backup, scoped by account.
- Single browser-tab lock; cloud revision compare-and-swap; conflicts retain a
  recoverable local copy and stop simulation.
- API verifies current account, request origin, version, slot and payload bounds.
- Database function uses `auth.uid()`, never a supplied owner ID. RLS permits only
  own-account reads; direct table writes and anonymous access are revoked.
- Cloud requests bind to the account present when the game opened, preventing
  another tab's sign-in from silently saving to a different account.
- Guest saves can be exported and imported after sign-in. Mac saves use the same
  format. Never parse/restringify the payload with JavaScript.

Database migration: `supabase/migrations/202609160001_franchise_saves.sql`.
Auth redirect allowlist: the exact deployed origin + `/franchise/auth`; local
preview uses `http://127.0.0.1:3100/franchise/auth`. Keep the existing admin callback.
Google uses the site's existing provider. No test email or new real account is
generated automatically.

## Original 0.6.1 port verification (before gameplay updates)

- 5,430 original simulation assertions on the platform-adapted code.
- 160 original UI action assertions (font/logo checks use bundled files).
- All 13 reference states match in WebAssembly: seven clubs, training, first game,
  commerce, completed season, next season and fantasy draft. UInt64 values match
  exactly; floating point comparisons allow an absolute tolerance of 1e-9.
- All 50 reference scenes execute in Wasm and render through Canvas2D.
- Isolated Chrome, Firefox and WebKit tests cover creation, tutorial, positions,
  development, stats, rosters, player cards, simulate/pause, lossless download
  and reload, including mouse/keyboard input during engine loading.
- Mocked account tests in all three engines cover sync revisions, restore and
  conflicts. Real Google login, account save, changed-state sync and cloud restore
  were also verified on the Vercel preview with the user-authorized account.
- Supabase transaction test confirms revision conflicts, exact UInt64 storage,
  account isolation and denial of direct writes. All test rows were rolled back.
- Live guest-only test confirms the configured account entrance, anonymous API
  protection, engine/assets and local save/reload without account mocks.
- Next.js production build succeeds.

## Limits to verify before claiming full release parity

Canvas and AppKit rasterize fonts differently; the drawing coordinates and font
assets are shared, but pixel identity is not claimed. WebKit tests do not replace
a full Safari/device performance matrix. The original game's
ratings and data-coverage limitations remain exactly as documented in its UI.
Cloud accepts raw saves up to 16 MB, with gzip transport to keep growing careers
within hosting request limits. Oversize saves report an error; local saves remain
available for export. No career data is truncated.

## Photo delivery

`npm run franchise:photos` produces content-hashed WebP derivatives without
modifying the original JPEGs. Full-screen derivatives retain the source resolution
(quality 92); card derivatives are bounded to 960 pixels (quality 90). The renderer
selects the appropriate variant, decodes asynchronously and retains the previous
photo until the replacement is ready. Club/card sequences preload the next image.
Decoded photos are limited to a working set of 24; hashed files use a one-year
immutable HTTP cache. Missing derivatives fall back to the original JPEG.

All 72 full-size derivatives total 47.8 MB versus 173.5 MB of original JPEGs;
all 72 card variants total 5.3 MB. These totals describe the asset library, not a
single page download. `npm run franchise:test:images` checks variants, delayed
download continuity, cache bounds and fallback.

## 0.6.2 franchise update

- Permanent 1–3 player trades replace the loan menu. Saved GM strictness affects
  value thresholds; age, positional coverage, active roster minimums and star
  premiums matter. Repeated identical offers are blocked for the current day.
  Existing legacy loans finish normally. Unaffected lineup slots are retained.
- CPU clubs use eight-week development cohorts and emphasize impactful skills.
  All clubs retain ability/OVR history; league rosters show fractional OVR growth.
  Training rates and fatigue constraints remain shared with the human club.
- Steal attempt frequency follows observed 2026 SB/CS per PA, shrunk for small
  samples. Development and score margin also affect attempts.
- New sponsorship fees range from €16k to €300k before placement/term modifiers;
  existing signed contracts keep their agreed terms. Eight additional logo assets
  expand the catalog to 23 brands, with sources in Assets/Sponsors/update-sources.json.
- Overview includes game-day countdown. Playoffs offer a game, one series or the
  remaining postseason; simulation progresses visibly and can be stopped.
- Save schema remains compatible with 0.6.1; optional new fields permit old saves.
  API engineVersion 0.6.1 denotes this compatibility envelope. Old native versions
  do not understand trade history, so continued play should use the updated game.

Validation: `python3 scripts/test-franchise-update.py` covers trades, strictness,
roster repair, sponsorship payment persistence, 12 full seasons and real UI tick
loops through postseason series and final. Across seeds tested, SB leaders were
22–28 (mean 25.9); 69 CPU players gained at least 0.5 OVR and the maximum seasonal
gain was 2.74. Injury-free fixtures isolate balance, not a claim every live season
will produce identical outcomes. The original simulation suite passed 5,425
assertions; UI suite passed 168. Original reference fixture outcomes intentionally
differ after these simulation changes.
