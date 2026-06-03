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
  sponsorLogo?: string
}

export const AWARD_CATEGORIES: AwardCategory[] = [
  {
    key: 'pitcher-of-month',
    nl: 'SSK Pitcher of the Month',
    en: 'SSK Pitcher of the Month',
    icon: '⚾',
    description: 'Best pitching performance of the month',
    sponsorLogo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395350/SSK_LOGO_nnm9t2.png',
  },
  {
    key: 'hitter-of-month',
    nl: 'Bat King Europe Hitter of the Month',
    en: 'Bat King Europe Hitter of the Month',
    icon: '🏏',
    description: 'Best hitting performance of the month',
    sponsorLogo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394738/BatKingEurope_Logo_rgb_white_w30lxp.webp',
  },
  {
    key: 'hottest-player-week',
    nl: 'Totaalwarmte Hottest Player of the Week',
    en: 'Totaalwarmte Hottest Player of the Week',
    icon: '🔥',
    description: 'Most impressive performance of the week',
    sponsorLogo: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394730/Logo_Diap_RGB_Totaalwarmte_ybdfbz.png',
  },
]

export const AWARDS: Award[] = [
  // Totaalwarmte Hottest Player of the Week 2026
  { season: 2026, category: 'hottest-player-week', playerName: 'Terrance Heemskerk', teamId: 'hcaw',     label: 'Week 1', note: '6-for-12, 9 RBI' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Dayrell Pieternella', teamId: 'uvv',      label: 'Week 2', note: '3 HR, 4 RBI, 1.644 OPS' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Dwayne Kemp',         teamId: 'neptunus', label: 'Week 3', note: '6/11 (.545), 6 RBI' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Christian Diaz',      teamId: 'neptunus', label: 'Week 4', note: '7-for-13 (.538), 1 HR, 4 RBI' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Noah Zavolas',        teamId: 'kinheim',  label: 'Week 5', note: 'CG shutout, 12K, 0.00 ERA' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Jeandro Tromp',       teamId: 'pirates',  label: 'Week 6', note: '9-for-12 (.750), 17 TB, 3 2B, 3B, HR, 4 RBI, 4 R, 2.186 OPS' },
  { season: 2026, category: 'hottest-player-week', playerName: 'Nando Mostaert',      teamId: 'twins',    label: 'Week 7', note: '5-for-9 (.556), 2 2B, HR, 10 TB, 5 RBI, 4 R, 1.778 OPS' },
  // SSK Pitcher of the Month 2026
  { season: 2026, category: 'pitcher-of-month', playerName: 'Shairon Martis', teamId: 'neptunus', label: 'Month 1' },
  { season: 2026, category: 'pitcher-of-month', playerName: 'Lars Huijer',    teamId: 'pirates',  label: 'Month 2' },
  // Bat King Europe Hitter of the Month 2026
  { season: 2026, category: 'hitter-of-month',  playerName: 'Darryl Collins',  teamId: 'neptunus', label: 'Month 1' },
  { season: 2026, category: 'hitter-of-month',  playerName: 'Jeandro Tromp',   teamId: 'pirates',  label: 'Month 2' },
]

export function getAwardsByPlayer(playerName: string): Award[] {
  return AWARDS.filter(a => a.playerName === playerName)
}

export function getAwardsBySeason(season: number): Award[] {
  return AWARDS.filter(a => a.season === season)
}

export const SEASONS = [2026, 2025, 2024, 2023]
