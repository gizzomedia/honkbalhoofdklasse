export const TEAM_IDS = ['neptunus', 'pirates', 'kinheim', 'hcaw', 'twins', 'pioniers', 'uvv'] as const
export type TeamId = typeof TEAM_IDS[number]

export const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31', pirates: '#0f6f38', kinheim: '#c0232e',
  hcaw: '#f5b51a', twins: '#ee7e1a', pioniers: '#3d68e9', uvv: '#db002f',
}

export const TEAM_LOGOS: Record<string, string> = {
  neptunus: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780156951/Neptunus_logo_wit_fngf7e.png',
  pirates:  'https://res.cloudinary.com/dn8c5398m/image/upload/v1780156947/pirates_logo_gajwir.png',
  kinheim:  'https://res.cloudinary.com/dn8c5398m/image/upload/v1780157135/Kinheim_logo_d4zw2t_nmiokn.png',
  hcaw:     'https://res.cloudinary.com/dn8c5398m/image/upload/v1780156939/HCAW_logo_wit_u1l9uf.png',
  twins:    'https://res.cloudinary.com/dn8c5398m/image/upload/v1780156976/Twins_wit_ildguz.png',
  pioniers: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780157246/PIoniers_logo_pyfnxv.png',
  uvv:      'https://res.cloudinary.com/dn8c5398m/image/upload/v1780156986/UVV_logo_qgmaz9.png',
}

export const TEAM_NAMES: Record<string, string> = {
  neptunus: 'Curaçao Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
}

export const TEAM_SHORT: Record<string, string> = {
  neptunus: 'NEP', pirates: 'PIR', kinheim: 'KIN',
  hcaw: 'HCA', twins: 'TWI', pioniers: 'PIO', uvv: 'UVV',
}

/** Maps KNBSB numeric team IDs to internal team IDs */
export const KNBSB_NUMERIC_ID_MAP: Record<number, string> = {
  39583: 'pirates', 39587: 'neptunus', 39584: 'hcaw',
  39586: 'kinheim', 39588: 'twins',   39589: 'uvv', 39585: 'pioniers',
}

/** Maps KNBSB API team codes to internal team IDs */
export const KNBSB_TEAM_MAP: Record<string, string> = {
  NEP: 'neptunus', AMS: 'pirates', PIR: 'pirates',
  HCA: 'hcaw', KIN: 'kinheim', PIO: 'pioniers', UVV: 'uvv', TWI: 'twins',
}

/** Maps stenwessel IOC codes to internal team IDs */
export const IOC_TO_TEAM: Record<string, string> = {
  NEP: 'neptunus', PIR: 'pirates', AMS: 'pirates', KIN: 'kinheim',
  HCA: 'hcaw', TWI: 'twins', PIO: 'pioniers', UVV: 'uvv',
}

/** Returns amber accent for dark Neptunus navy, otherwise the team color itself */
export function teamAccent(teamId: string): string {
  return TEAM_COLORS[teamId] === '#121b31' ? '#f59e0b' : (TEAM_COLORS[teamId] ?? '#fe3d00')
}
