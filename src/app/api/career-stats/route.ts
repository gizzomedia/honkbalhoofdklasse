import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

type StatRow = Record<string, string>

function extractTable(html: string, tableId: string): StatRow[] {
  // Baseball-reference wraps some tables in HTML comments — strip them first
  const clean = html.replace(/<!--([\s\S]*?)-->/g, '$1')

  const tableMatch = clean.match(new RegExp(`<table[^>]+id="${tableId}"[^>]*>([\\s\\S]*?)</table>`))
  if (!tableMatch) return []

  const rows: StatRow[] = []
  const rowMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]

  for (const row of rowMatches) {
    const rowHtml = row[1]
    if (!rowHtml.includes('data-stat')) continue

    const cells: StatRow = {}
    const cellMatches = [...rowHtml.matchAll(/data-stat="([^"]+)"[^>]*>([\s\S]*?)<\/(?:td|th)>/g)]
    for (const [, stat, raw] of cellMatches) {
      cells[stat] = raw.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, '').trim()
    }

    if (cells['year_ID'] && (cells['year_ID'].match(/^\d{4}$/) || cells['year_ID'] === 'Career')) {
      rows.push(cells)
    }
  }

  return rows
}

function parseBatting(html: string) {
  return extractTable(html, 'batting_standard').map(r => ({
    year: r['year_ID'] ?? '',
    age:  r['age']     ?? '',
    lg:   r['lg_ID']   ?? '',
    team: r['team_ID'] ?? '',
    g:    r['G']       ?? '',
    ab:   r['AB']      ?? '',
    r:    r['R']       ?? '',
    h:    r['H']       ?? '',
    d:    r['2B']      ?? '',
    t:    r['3B']      ?? '',
    hr:   r['HR']      ?? '',
    rbi:  r['RBI']     ?? '',
    bb:   r['BB']      ?? '',
    so:   r['SO']      ?? '',
    avg:  r['batting_avg']    ?? '',
    obp:  r['onbase_perc']    ?? '',
    slg:  r['slugging_perc']  ?? '',
  }))
}

function parsePitching(html: string) {
  return extractTable(html, 'pitching_standard').map(r => ({
    year: r['year_ID']         ?? '',
    age:  r['age']             ?? '',
    lg:   r['lg_ID']           ?? '',
    team: r['team_ID']         ?? '',
    w:    r['W']               ?? '',
    l:    r['L']               ?? '',
    era:  r['earned_run_avg']  ?? '',
    g:    r['G']               ?? '',
    gs:   r['GS']              ?? '',
    sv:   r['SV']              ?? '',
    ip:   r['IP']              ?? '',
    h:    r['H']               ?? '',
    bb:   r['BB']              ?? '',
    so:   r['SO']              ?? '',
    whip: r['whip']            ?? '',
  }))
}

export async function GET(req: NextRequest) {
  const bbrefId = req.nextUrl.searchParams.get('id')
  if (!bbrefId || !/^[a-z0-9-]+$/.test(bbrefId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const url = `https://www.baseball-reference.com/register/player.fcgi?id=${bbrefId}`
    const res = await fetch(url, { headers: HEADERS })

    if (!res.ok) {
      return NextResponse.json({ batting: [], pitching: [], error: `bbref ${res.status}` })
    }

    const html = await res.text()

    // Quick check: if we got a bot-block page, tables won't exist
    if (html.length < 5000) {
      return NextResponse.json({ batting: [], pitching: [], error: 'blocked' })
    }

    const batting  = parseBatting(html)
    const pitching = parsePitching(html)

    return NextResponse.json({ batting, pitching }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
    })
  } catch (e) {
    return NextResponse.json({ batting: [], pitching: [], error: String(e) })
  }
}
