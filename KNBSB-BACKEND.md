# KNBSB Backend Migration

## Overview

We have migrated the data backend from Stenwessel API (`boxscore.stenwessel.nl`) to directly scraping KNBSB stats (`stats.knbsbstats.nl`). This gives us the official data source.

## Why?

- **Official source**: Data comes directly from stats.knbsbstats.nl (the official KNBSB stats platform)
- **Complete data**: Includes proper substitution tracking with pinch runners/hitters
- **Better reliability**: Not dependent on 3rd-party boxscore API

## Completed Migrations

### Endpoints Using KNBSB Scraper

- ✅ **`/api/livescores`** - Fetch live and finished games with current scores
- ✅ **`/api/boxscore/[gameId]`** - Fetch detailed game boxscores with batting/pitching stats
- ✅ **`/api/player-splits`** - Fetch individual player game logs and splits

All three return the same response format as before (Stenwessel compatible), so the frontend sees no changes.

### Implementation: `lib/knbsb-scraper.ts`

```typescript
// Main functions:
- fetchSchedule(): Promise<{ games: StenwesselGame[] }>
- fetchGameBoxscore(gameId): Promise<StenwesselBoxScore>
```

**How it works:**

1. Fetch game page from stats.knbsbstats.nl
2. Extract embedded JSON from `data-page` HTML attribute
3. Decode HTML entities
4. Parse and transform to Stenwessel-compatible structure

**Example:**
```javascript
// Before: Stenwessel API call
const r = await fetch('https://boxscore.stenwessel.nl/api/fetchgamedata.php?game=202990')

// After: KNBSB scraper
const data = await fetchGameBoxscore('202990')
```

## Data Structure

### BoxScore Format

```javascript
boxScore = {
  "<teamid_away>": {
    "1": [{ player }, { player_sub }, ...],  // batting spot 1
    "2": [...],                              // batting spot 2
    ...
    "90": [{ pitcher }, ...]                 // pitchers
  },
  "<teamid_home>": { ... }
}
```

### Player Object Fields

| Field | Type | Meaning |
|-------|------|---------|
| `playerid` | string | Unique player ID (for deduplication) |
| `firstname`, `lastname` | string | Player name |
| `spot` | number | Batting order 1-9, or 90 for pitchers |
| `sub` | number | 0 = starter, >0 = substitute (order of entry) |
| `pos` | string | Position: "SS", "2B", "PR" (pinch runner), "PH" (pinch hitter), etc |
| `pa`, `ab`, `bb`, `hbp`, `sf`, `sh` | number | Batting stats |
| `r`, `h`, `rbi`, `so`, `hr`, `double`, `triple`, `sb` | number | Hit stats |
| `pitch_ip`, `pitch_appear` | number | Pitcher appearance stats |
| `pitch_h`, `pitch_r`, `pitch_er`, `pitch_bb`, `pitch_so` | number | Pitcher performance stats |
| `pitch_win`, `pitch_loss`, `pitch_save` | number | Pitcher decisions |

### How Substitutes Work

- **Starters**: `spot >= 1 && spot <= 9` and `sub === 0`
- **Substitutes**: `spot >= 1 && spot <= 9` and `sub > 0` (even with 0 plate appearances)
- **Pitchers**: Always `spot === 90`, never appear in batting lineup
- **Position designations**: `pos` field shows "PR" (pinch runner), "PH" (pinch hitter), "PR/2B" (pinch runner playing 2B), etc

### Deduplication

When a player appears in multiple batting spots (rare), keep the record with highest `pa + pitch_ip`.

## Batting Lineup Logic

See `src/app/api/boxscore/[gameId]/route.ts` - `extractBatters()` function:

```javascript
function inLineup(p) {
  const spot = Number(p.spot);
  const hasBattingSpot = spot >= 1 && spot <= 9;
  const hasPA = Number(p.pa) > 0 || Number(p.ab) > 0 || Number(p.bb) > 0 || ...;
  const isSub = Number(p.sub) > 0;
  
  // Include if: valid spot AND (has PA OR is substitute)
  return hasBattingSpot && (hasPA || isSub);
}

// Sort by spot, then by sub (starter first, then subs in order)
batters.sort((a, b) => (a.spot - b.spot) || (a.sub - b.sub));
```

**Result:** Pinch runners with 0 plate appearances now correctly appear in the batting lineup.

## Test Case: Game 202990

Kinheim @ Oosterhout Twins, 2026-06-23

### Away team (Kinheim)
- ✅ **Guus TOEMEN** - `pos: "PR"`, `spot: 8`, `sub: 1`, `ab: 0`, `r: 0`
  - Pinch runner, appears in spot 8 after Jayvon Vicario

### Home team (Twins)
- ✅ **Yves POESMANS** - `pos: "PR/2B"`, `spot: 1`, `sub: 1`, `ab: 0`, `r: 1`
  - Pinch runner who played 2B, appears in spot 1 after Gijs van Zalingen, scored 1 run

Test endpoint: `GET /api/boxscore/202990`

## Remaining Work

### Endpoints Still Using Stenwessel

- [ ] `/api/sync` - Full schedule and standings sync
- [ ] `/api/push/live-monitor` - Live game monitoring and push notifications
- [ ] `/api/admin/import-series` - Admin endpoint for series import
- [ ] `/api/leaders/month` - Monthly statistical leaders
- [ ] `/api/win-probability/[gameId]` - Win probability calculator

### Considerations for Future Migration

1. **Rate limiting**: KNBSB may have scraping restrictions; monitor for 429/403 responses
2. **HTML stability**: If KNBSB changes HTML structure, `data-page` extraction breaks
3. **Fallback strategy**: Consider keeping Stenwessel as backup source
4. **Caching**: Add aggressive caching for frequently accessed boxscores

## Related Commits

```
8da72f5 - Fix batting lineup to include substitutes with zero PA
860885a - Fix starter/substitute detection in boxscores
b0282f8 - Fix TypeScript type mismatch in player-splits
45de22b - Switch from Stenwessel to KNBSB scraper for live data
```

## References

- KNBSB Stats: https://stats.knbsbstats.nl/
- Example game: https://stats.knbsbstats.nl/en/events/2026-lucky-day-hoofdklasse/schedule-and-results/box-score/202990
- Original n8n workflow (used as reference): https://honkbalhoofdklasse.app.n8n.cloud/workflow/MZhrjAUanCB8XU8f
