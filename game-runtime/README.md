# Hoofdklasse Franchise — browser port of 0.6.1

The original Swift simulation and management screen bodies run in WebAssembly.
`Native/` pins the desktop source. `scripts/generate-franchise.py` replaces only
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

## Verification completed

- 5,430 original simulation assertions on the platform-adapted code.
- 160 original UI action assertions (font/logo checks use bundled files).
- All 13 reference states match in WebAssembly: seven clubs, training, first game,
  commerce, completed season, next season and fantasy draft. UInt64 values match
  exactly; floating point comparisons allow an absolute tolerance of 1e-9.
- All 50 reference scenes execute in Wasm and render through Canvas2D.
- Isolated Chrome tests cover creation, tutorial, positions, development, stats,
  rosters, player cards, simulate/pause, lossless download and reload.
- Mocked account tests cover sync revisions, restore and conflicts. These are not
  a substitute for a real-account login/save/load test after deployment.
- Supabase transaction test confirms revision conflicts, exact UInt64 storage,
  account isolation and denial of direct writes. All test rows were rolled back.
- Live guest-only test confirms the configured account entrance, anonymous API
  protection, engine/assets and local save/reload without account mocks.
- Next.js production build succeeds.

## Limits to verify before claiming full release parity

Canvas and AppKit rasterize fonts differently; the drawing coordinates and font
assets are shared, but pixel identity is not claimed. Safari/Firefox and real
account login/save/restore still require deployment testing. The original game's
ratings and data-coverage limitations remain exactly as documented in its UI.
Cloud accepts raw saves up to 16 MB, with gzip transport to keep growing careers
within hosting request limits. Oversize saves report an error; local saves remain
available for export. No career data is truncated.
