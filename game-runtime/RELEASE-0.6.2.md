# Franchise 0.6.2 — 16 September 2026

## Player-facing changes

- Trades replace new loans. Offer/request 1–3 players, set relaxed/balanced/strict
  GM evaluation, inspect cards, and submit an offer. Declines explain the reason.
  Healthy roster/position depth, age, impact and star premiums influence acceptance.
- CPU development plans last eight weeks before rotating their focus group. Growth
  uses the same training pace as the human club. League rosters show OVR change.
- Stolen-base attempts reflect each player's observed 2026 volume, with conservative
  treatment of small samples and score-margin adjustments.
- Eight new brands: Zeeman, HEMA, DeMarini, Louisville Slugger, Mizuno, Vans,
  The North Face and BOSS. New fees are substantially higher and still scale by
  placement and term. Signed contracts retain their agreed amounts until expiry.
- Game-day countdown on Overview. Playoffs can run by game, series or to the final
  champion; calendar days remain visible and Stop/Space pauses progress.
- Photos use full-resolution WebP and smaller card variants, decoding before display.
  Old photos stay visible during downloads. Cached decoded photos have a memory cap.

## Saves and compatibility

Existing saves are supported. Trade history and GM strictness are optional fields;
older loans still return at their original season boundary. Rosters, growth and
cash are not reset. New sponsor prices apply to new offers, not signed agreements.
The 0.6.1 save/API compatibility identifier remains accepted; the UI shows 0.6.2.

## Balance tests

Twelve complete seeded, injury-free seasons produced steal leaders of 22–28
(mean 25.9). In those fixtures, 69 CPU players gained at least 0.5 OVR; the largest
individual season gain was 2.74. These figures validate the intended pace, not
fixed outcomes for every career. Player skill development affects simulation.

2,263 dedicated assertions cover accepted/declined trades, strictness, duplicate/depth guards,
save-valid roster repairs, contract persistence and single-payment behavior,
series completion, full postseason completion and manual stop. The original
simulation suite also passed 5,425 assertions and the UI suite 168 checks.

## Suggested next releases

1. Transfer deadlines and CPU counteroffers: roster needs, incoming proposals and
   an inbox decision flow, with scouting uncertainty rather than guaranteed deals.
2. Annual youth intake: small regional prospect classes with different development
   ceilings and scouting confidence; gradual progression rather than instant stars.
3. Board expectations and club identity: distinct objectives for contenders,
   development clubs and financially constrained clubs across multiple seasons.
4. Rivalry and attendance events: derby days, sponsor activations and fan feedback
   that create trade-offs between income, reputation and sporting results.

Chrome, Firefox and WebKit pass the new trade-selection/submission, saved GM
strictness, navigation, simulation-stop and save/reload browser checks. The photo
cache test and Next.js production build also pass.
