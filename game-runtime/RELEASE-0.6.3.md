# Franchise 0.6.3

## Trades and settings

GM strictness is now exclusively under Career → Settings. Existing saved values
are retained. A rejected proposal may produce a concrete counteroffer: the CPU
can ask for extra players, remove a requested player or suggest an alternative.
Packages still contain at most three players per side and must preserve healthy
roster depth. Review the complete names and sign or decline the counteroffer.
Offers persist for seven calendar days, never execute automatically and are
revalidated against ownership, health, deadline and GM settings on acceptance.

## Youth intake and scouting

Development → Farm → Youth Scouting presents three fictional regional prospects
per club per season. They are explicitly distinguished from real 2026 players.
An initial potential range can be narrowed through two scouting reports costing
€800 and €1,500. Reports improve confidence without promising a final OVR.

Academy contracts cost €5,000–€9,000 plus the existing €150 weekly farm development
cost. Players join the farm, where chosen skill training, age, facilities and
individual ceilings influence growth. The roster cap and available farm places
apply. Signing does not reset or replace real players. CPU clubs also recruit
within their budget and space limits, and promote academy players at age 21 or
68 OVR. Intake, reports, signings and development limits survive save/reload.

A new class appears each season. Opening or reloading a class does not reroll it.
Unsigned prospects are replaced at the next season. Scouting cannot charge money
after the current season ends.

## Board expectations

Initial title ambitions apply to Neptunus and Pirates; Pioniers and UVV prioritize
club development, while Twins, HCAW and Kinheim aim for the top four. Subsequent
seasons adapt to the career's results. Targets are locked for the current season.
Four goals cover development, supporters, sporting results and finances.

At next-season rollover, a single board review records the results and adjusts
confidence. Meeting at least three goals earns a one-off €10,000 development
grant. Previously claimed objective rewards remain claimed when upgrading an
existing save. Board history and confidence persist across seasons.

## Existing careers

All features initialize when an existing career is loaded, without resetting the
year, calendar day, human club cash or roster. Optional fields preserve import
compatibility. Careers containing new academy players should continue in 0.6.3
or later; older clients cannot interpret their development data. The existing
server save compatibility identifier remains unchanged.

## A visible club complex

Club opens on a schematic ballpark and eight surrounding facilities. Each stadium
level adds a drawn grandstand section and the existing 300 real seats. Other
buildings grow with their saved levels. Select any facility for its active effect,
then inspect a side-by-side current/next-level preview before purchasing. The
preview does not change cash, RNG, fans or facilities. All Facilities retains the
compact nine-card management view. Ticket controls and the ledger remain present.

Construction projects display their saved remaining days. Completed project
buildings remain visible; unfunded upkeep is explicitly labelled with paused
benefits. The complex is a management illustration, not an accurate recreation
of any real club's stadium. There are no new hidden economic bonuses.

## Player career statistics

Every player card links to Career Stats, with batting, pitching and fielding
views; all games, regular season and postseason filters; paginated annual rows;
and career totals. Team abbreviations come from actual game appearances, including
multiple clubs in a traded season. Rates are recomputed from accumulated counts,
not averaged between seasons, and innings are summed as outs.

At rollover, each player's season is archived before its counters reset. Archives
are optional save fields and persist through trades and cloud/local saves. The
current season is included live. Real-world 2026 input statistics remain separate
from the simulated career. An old save cannot recover seasons that older versions
already discarded: the UI explicitly labels where its available archive starts.
Incomplete old game-box splits are excluded from split totals, not guessed.
