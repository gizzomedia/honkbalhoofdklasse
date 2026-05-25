import { ROSTERS, type Player } from './rosters-data'

// ── Criterion types ────────────────────────────────────────────────────────────

export type Criterion =
  | { type: 'team';     teamId: string;   label: string; logo: string }
  | { type: 'position'; positions: string[]; label: string; icon: string }
  | { type: 'bats';     value: string;    label: string; icon: string }
  | { type: 'throws';   value: string;    label: string; icon: string }
  | { type: 'yob_max';  year: number;     label: string; icon: string }
  | { type: 'yob_min';  year: number;     label: string; icon: string }

const LOGOS: Record<string, string> = {
  neptunus: 'https://res.cloudinary.com/dqld625sq/image/upload/v1770654466/Neptunus_logo_wit_afyyae.png',
  pirates:  'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/pirates_logo_ic4rk8.png',
  kinheim:  'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/Kinheim_logo_d4zw2t.png',
  hcaw:     'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/HCAW_logo_wit_rijssy.png',
  twins:    'https://res.cloudinary.com/dqld625sq/image/upload/v1770654463/Twins_wit_c7dumy.png',
  pioniers: 'https://res.cloudinary.com/dqld625sq/image/upload/v1770654445/Pioniers_logo_mqj4tb.png',
  uvv:      'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/UVV_logo_xcaa5d.png',
}

function team(id: string, label: string): Criterion {
  return { type: 'team', teamId: id, label, logo: LOGOS[id] }
}

// Pre-built criteria
const C = {
  // Teams
  neptunus: team('neptunus', 'Neptunus'),
  pirates:  team('pirates',  'Amsterdam Pirates'),
  kinheim:  team('kinheim',  'Kinheim'),
  hcaw:     team('hcaw',     'HCAW'),
  twins:    team('twins',    'Oosterhout Twins'),
  pioniers: team('pioniers', 'Hoofddorp Pioniers'),
  uvv:      team('uvv',      'UVV'),

  // Position groups
  pitcher:   { type: 'position', positions: ['P'],                       label: 'Pitcher',   icon: '⚾' } as Criterion,
  catcher:   { type: 'position', positions: ['C', 'C/IF'],               label: 'Catcher',   icon: '🧤' } as Criterion,
  infielder: { type: 'position', positions: ['IF', 'C/IF'],              label: 'Infielder', icon: '🔷' } as Criterion,
  outfielder:{ type: 'position', positions: ['OF', 'UTL', 'DH'],         label: 'Outfielder',icon: '🌿' } as Criterion,
  nonPitcher:{ type: 'position', positions: ['C','IF','OF','C/IF','UTL','DH'], label: 'Position Player', icon: '🏏' } as Criterion,

  // Handedness
  switchHitter: { type: 'bats',   value: 'S', label: 'Switch Hitter', icon: '↔️' } as Criterion,
  leftBatter:   { type: 'bats',   value: 'L', label: 'Left-handed Batter', icon: '🫲' } as Criterion,
  rightBatter:  { type: 'bats',   value: 'R', label: 'Right-handed Batter', icon: '🫱' } as Criterion,
  leftThrower:  { type: 'throws', value: 'L', label: 'Left-handed Pitcher', icon: '🤜' } as Criterion,
  rightThrower: { type: 'throws', value: 'R', label: 'Right-handed Pitcher', icon: '🤛' } as Criterion,

  // Age
  veteran:  { type: 'yob_max', year: 1997, label: "Born '97 or Earlier", icon: '📅' } as Criterion,
  young:    { type: 'yob_min', year: 2002, label: "Born '02 or Later",   icon: '🌱' } as Criterion,
  mid:      { type: 'yob_max', year: 2001, label: "Born '98–'01",        icon: '📆' } as Criterion,
}

// ── Validity check ─────────────────────────────────────────────────────────────

export function playerMatchesCriterion(player: Player, teamId: string, crit: Criterion): boolean {
  switch (crit.type) {
    case 'team':     return teamId === crit.teamId
    case 'position': return crit.positions.includes(player.pos)
    case 'bats':     return player.bt.startsWith(crit.value)
    case 'throws':   return player.bt.endsWith(crit.value)
    case 'yob_max':  return player.yob <= crit.year
    case 'yob_min':  return player.yob >= crit.year
  }
}

export function isValidAnswer(playerName: string, teamId: string, rowCrit: Criterion, colCrit: Criterion): boolean {
  const roster = ROSTERS[teamId]
  if (!roster) return false
  const player = roster.players.find(p => p.name.toLowerCase() === playerName.toLowerCase())
  if (!player) return false
  return playerMatchesCriterion(player, teamId, rowCrit) &&
         playerMatchesCriterion(player, teamId, colCrit)
}

// Find all valid answers for a cell (used for autocomplete)
export function getValidPlayers(rowCrit: Criterion, colCrit: Criterion): { name: string; teamId: string }[] {
  const results: { name: string; teamId: string }[] = []
  for (const [teamId, roster] of Object.entries(ROSTERS)) {
    for (const player of roster.players) {
      if (playerMatchesCriterion(player, teamId, rowCrit) &&
          playerMatchesCriterion(player, teamId, colCrit)) {
        results.push({ name: player.name, teamId })
      }
    }
  }
  return results
}

// ── Weekly grids ───────────────────────────────────────────────────────────────

export type GridConfig = {
  week: number
  rows: [Criterion, Criterion, Criterion]
  cols: [Criterion, Criterion, Criterion]
}

export const WEEKLY_GRIDS: GridConfig[] = [
  {
    week: 1,
    rows: [C.neptunus, C.pirates, C.kinheim],
    cols: [C.pitcher, C.infielder, C.young],
  },
  {
    week: 2,
    rows: [C.hcaw, C.twins, C.uvv],
    cols: [C.pitcher, C.outfielder, C.veteran],
  },
  {
    week: 3,
    rows: [C.pioniers, C.neptunus, C.hcaw],
    cols: [C.catcher, C.leftBatter, C.young],
  },
  {
    week: 4,
    rows: [C.kinheim, C.pirates, C.uvv],
    cols: [C.pitcher, C.leftBatter, C.veteran],
  },
  {
    week: 5,
    rows: [C.twins, C.pioniers, C.neptunus],
    cols: [C.infielder, C.rightBatter, C.young],
  },
  {
    week: 6,
    rows: [C.pirates, C.kinheim, C.hcaw],
    cols: [C.pitcher, C.outfielder, C.veteran],
  },
  {
    week: 7,
    rows: [C.uvv, C.twins, C.pioniers],
    cols: [C.nonPitcher, C.leftBatter, C.veteran],
  },
  {
    week: 8,
    rows: [C.neptunus, C.kinheim, C.uvv],
    cols: [C.pitcher, C.catcher, C.young],
  },
]

// Returns false if any of the 9 cells has zero valid answers
export function gridIsValid(grid: GridConfig): boolean {
  for (const rowCrit of grid.rows) {
    for (const colCrit of grid.cols) {
      if (getValidPlayers(rowCrit, colCrit).length === 0) return false
    }
  }
  return true
}

const START_FRIDAY = new Date('2026-04-03') // First Friday of 2026 season

// Grid changes every Friday — find the most recent Friday
export function getMostRecentFriday(): Date {
  const now = new Date()
  const dow = now.getDay() // 0=Sun … 5=Fri … 6=Sat
  const daysBack = (dow - 5 + 7) % 7 // Fri→0 Sat→1 Sun→2 Mon→3 Tue→4 Wed→5 Thu→6
  const d = new Date(now)
  d.setDate(d.getDate() - daysBack)
  return d
}

// How many Fridays have passed since the season started (0-indexed)
export function getCurrentFridayNum(): number {
  const lastFriday = getMostRecentFriday()
  return Math.max(0, Math.floor((lastFriday.getTime() - START_FRIDAY.getTime()) / (7 * 24 * 60 * 60 * 1000)))
}

// The calendar date of a given fridayNum
export function getFridayDate(fridayNum: number): Date {
  const d = new Date(START_FRIDAY)
  d.setDate(d.getDate() + fridayNum * 7)
  return d
}

// Get the grid config for a specific fridayNum (rotates through valid grids)
export function getGridForFridayNum(fridayNum: number): GridConfig {
  const validGrids = WEEKLY_GRIDS.filter(gridIsValid)
  if (validGrids.length === 0) return WEEKLY_GRIDS[0]
  return validGrids[fridayNum % validGrids.length]
}

export function getCurrentWeekGrid(): GridConfig {
  return getGridForFridayNum(getCurrentFridayNum())
}

export function fridayDateKey(): string {
  const d = getMostRecentFriday()
  return `${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`
}
