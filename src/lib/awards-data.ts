export type Award = {
  season: number
  category: string
  playerName: string  // must match Player.name exactly
  teamId: string
  label?: string      // e.g. "Week 1", "Maand 1"
  note?: string
}

export type AwardCategory = {
  key: string
  nl: string
  en: string
  icon: string
  description: string
}

export const AWARD_CATEGORIES: AwardCategory[] = [
  { key: 'hottest-player-week', nl: 'Heetste Speler van de Week', en: 'Hottest Player of the Week', icon: '🔥', description: 'Meest indrukwekkende prestatie van de week' },
  { key: 'pitcher-of-month',    nl: 'Werper van de Maand',        en: 'Pitcher of the Month',       icon: '⚾', description: 'Beste werpprestatie van de maand' },
  { key: 'hitter-of-month',     nl: 'Slagman van de Maand',       en: 'Hitter of the Month',        icon: '🏏', description: 'Beste slagprestatie van de maand' },
]

export const AWARDS: Award[] = [
  // Heetste Speler van de Week 2026
  { season: 2026, category: 'hottest-player-week', playerName: 'Terrance Heemskerk', teamId: 'hcaw',     label: 'Week 1', note: '6-for-12, 9 RBI' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Dayrell Pieternella', teamId: 'uvv',      label: 'Week 2', note: '3 HR, 4 RBI, 1.644 OPS' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Dwayne Kemp',         teamId: 'neptunus', label: 'Week 3', note: '6/11 (.545), 6 RBI' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Christian Diaz',      teamId: 'neptunus', label: 'Week 4', note: '7-for-13 (.538), 1 HR, 4 RBI' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Noah Zavolas',        teamId: 'kinheim',  label: 'Week 5', note: 'CG shutout, 12K, 0.00 ERA' },
  // Werper van de Maand 2026
  { season: 2026, category: 'pitcher-of-month', playerName: 'Shairon Martis',  teamId: 'neptunus', label: 'Maand 1' },
  // Slagman van de Maand 2026
  { season: 2026, category: 'hitter-of-month',  playerName: 'Darryl Collins',  teamId: 'neptunus', label: 'Maand 1' },
]

export function getAwardsByPlayer(playerName: string): Award[] {
  return AWARDS.filter(a => a.playerName === playerName)
}

export function getAwardsBySeason(season: number): Award[] {
  return AWARDS.filter(a => a.season === season)
}

export const SEASONS = [2026, 2025, 2024, 2023]
