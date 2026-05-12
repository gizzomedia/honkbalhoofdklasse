import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export type Standing = {
  team_id: string
  team_name: string
  short_name: string
  logo_url: string | null
  primary_color: string | null
  games_played: number
  wins: number
  losses: number
  ties: number
  win_pct: number
  runs_scored: number
  runs_allowed: number
  games_behind: number | null
}

export type Game = {
  id: number
  external_id: string
  game_date: string
  game_time: string | null
  home_team_id: string
  away_team_id: string
  home_team_name: string
  away_team_name: string
  home_short: string
  away_short: string
  home_logo: string | null
  away_logo: string | null
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'live' | 'final' | 'postponed'
  venue: string | null
}
