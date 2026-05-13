export type Award = {
  season: number
  category: string
  playerName: string  // must match Player.name exactly
  teamId: string
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
  { key: 'mvp',              nl: 'Meest Waardevolle Speler', en: 'Most Valuable Player',    icon: '🏆', description: 'De beste allround speler van het seizoen' },
  { key: 'batting-champion', nl: 'Slagkampioen',             en: 'Batting Champion',         icon: '⚾', description: 'Hoogste slaggemiddelde van het seizoen' },
  { key: 'era-champion',     nl: 'ERA Kampioen',             en: 'ERA Champion',             icon: '🎯', description: 'Laagste ERA onder startende werpers' },
  { key: 'pitcher-of-year',  nl: 'Werper van het Jaar',      en: 'Pitcher of the Year',     icon: '🔥', description: 'Beste werpprestatie van het seizoen' },
  { key: 'rookie-of-year',   nl: 'Rookie van het Jaar',      en: 'Rookie of the Year',      icon: '⭐', description: 'Beste nieuwe speler van het seizoen' },
  { key: 'gold-glove',       nl: 'Gouden Handschoen',        en: 'Gold Glove',              icon: '🥇', description: 'Beste verdediger van het seizoen' },
  { key: 'manager-of-year',  nl: 'Manager van het Jaar',     en: 'Manager of the Year',     icon: '📋', description: 'Beste manager/hoofdcoach van het seizoen' },
]

// Award winners per season
// Voeg hier de winnaars toe zodra het seizoen is afgelopen
// Voorbeeld: { season: 2026, category: 'mvp', playerName: 'Shairon Martis', teamId: 'neptunus' }
export const AWARDS: Award[] = [
  // 2026 seizoen wordt einde seizoen bekendgemaakt
]

export function getAwardsByPlayer(playerName: string): Award[] {
  return AWARDS.filter(a => a.playerName === playerName)
}

export function getAwardsBySeason(season: number): Award[] {
  return AWARDS.filter(a => a.season === season)
}

export const SEASONS = [2026, 2025, 2024, 2023]
