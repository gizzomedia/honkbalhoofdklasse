// ═══════════════════════════════════════════════════════════
//  HONKBAL HOOFDKLASSE — Scriptable iOS Widget
//  Supports: small (koploper), medium (top 4 + next game),
//            large (volledige stand + uitslagen + next game)
//
//  Installatie: kopieer dit bestand naar Scriptable → kies
//  als widget-script → stel widgetfamilie in.
// ═══════════════════════════════════════════════════════════

// ── Supabase config ────────────────────────────────────────
const SB_URL = "https://qlowdrzergyuxzkzahqf.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsb3dkcnplcmd5dXh6a3phaHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mjc4MTMsImV4cCI6MjA5NDEwMzgxM30.vFwmaA19UYhdXvyXaRsJMgTX12X_q2q5DWYkpEHAphE"

// ── Team data ──────────────────────────────────────────────
const TEAM_COLOR = {
  neptunus: "#121b31", pirates: "#0f6f38", kinheim: "#c0232e",
  hcaw:     "#f5b51a", twins:   "#ee7e1a", pioniers: "#3d68e9",
  uvv:      "#db002f",
}
const TEAM_NAME = {
  neptunus: "Neptunus", pirates: "Pirates",  kinheim: "Kinheim",
  hcaw:     "HCAW",    twins:   "Twins",     pioniers: "Pioniers",
  uvv:      "UVV",
}
const TEAM_SHORT = {
  neptunus: "NEP", pirates: "PIR", kinheim: "KIN",
  hcaw:     "HCA", twins:   "TWI", pioniers: "PIO",
  uvv:      "UVV",
}
const TEAM_LOGO_URL = {
  neptunus: "https://res.cloudinary.com/dqld625sq/image/upload/v1770654466/Neptunus_logo_wit_afyyae.png",
  pirates:  "https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/pirates_logo_ic4rk8.png",
  kinheim:  "https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/Kinheim_logo_d4zw2t.png",
  hcaw:     "https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/HCAW_logo_wit_rijssy.png",
  twins:    "https://res.cloudinary.com/dqld625sq/image/upload/v1770654463/Twins_wit_c7dumy.png",
  pioniers: "https://res.cloudinary.com/dqld625sq/image/upload/v1770654445/Pioniers_logo_mqj4tb.png",
  uvv:      "https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/UVV_logo_xcaa5d.png",
}

// ── Palette ────────────────────────────────────────────────
const C = {
  bg:     new Color("#060e1b"),
  card:   new Color("#0a1220"),
  accent: new Color("#fe3d00"),
  muted:  new Color("#4a6a8a"),
  dim:    new Color("#8BA0B8"),
  border: new Color("#1a2a3a"),
  white:  Color.white(),
}

// ── Logo cache ─────────────────────────────────────────────
const fm    = FileManager.local()
const CACHE = fm.joinPath(fm.cacheDirectory(), "hk_widget_logos")
if (!fm.fileExists(CACHE)) fm.createDirectory(CACHE)

async function loadLogo(teamId) {
  const path = fm.joinPath(CACHE, `${teamId}.png`)
  try {
    if (fm.fileExists(path)) {
      const ageMs = Date.now() - fm.modificationDate(path).getTime()
      if (ageMs < 7 * 86400 * 1000) return fm.readImage(path)
    }
    const img = await new Request(TEAM_LOGO_URL[teamId]).loadImage()
    fm.writeImage(path, img)
    return img
  } catch { return null }
}

async function loadAllLogos() {
  const logos = {}
  await Promise.allSettled(
    Object.keys(TEAM_LOGO_URL).map(async id => {
      const img = await loadLogo(id)
      if (img) logos[id] = img
    })
  )
  return logos
}

// ── Data fetching ──────────────────────────────────────────
async function sbGet(table, qs) {
  const req = new Request(`${SB_URL}/rest/v1/${table}?${qs}`)
  req.headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
  return req.loadJSON()
}

async function fetchStandings() {
  return sbGet("standings", "season=eq.2026&order=wins.desc,win_pct.desc")
}

async function fetchRecentGames(n = 3) {
  return sbGet("games", `status=eq.final&order=game_date.desc&limit=${n}`)
}

async function fetchUpcoming(n = 3) {
  const today = new Date().toISOString().split("T")[0]
  return sbGet("games", `status=eq.scheduled&game_date=gte.${today}&order=game_date.asc,game_time.asc&limit=${n}`)
}

async function fetchLive() {
  return sbGet("games", "status=eq.live")
}

// ── Helpers ────────────────────────────────────────────────
function fmtPct(wins, losses) {
  const g = wins + losses
  if (!g) return ".000"
  const p = (wins / g).toFixed(3)
  return p.startsWith("1.") ? "1.000" : p.replace("0.", ".")
}

function fmtDate(ds) {
  const d = new Date(ds + "T12:00:00")
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
}

function fmtTime(ts) {
  return ts ? ts.slice(0, 5) : ""
}

function teamClr(id) {
  return new Color(TEAM_COLOR[id] ?? "#1e335a")
}

// ── UI primitives ──────────────────────────────────────────

// Horizontal divider line
function addHLine(parent, opacity = 0.4) {
  const line = parent.addStack()
  line.backgroundColor = new Color("#1a2a3a", opacity)
  line.size = new Size(0, 1)
  line.addSpacer()
}

// Section label (small caps style)
function addLabel(parent, text, color = C.muted) {
  const t = parent.addText(text)
  t.font = Font.boldSystemFont(7)
  t.textColor = color
  return t
}

// Team logo chip  – colored square with logo or abbreviation
function addLogoChip(stack, teamId, logos, size) {
  const chip = stack.addStack()
  chip.backgroundColor = teamClr(teamId)
  chip.cornerRadius = Math.round(size * 0.2)
  chip.size = new Size(size, size)
  chip.centerAlignContent()
  chip.layoutHorizontally()
  const img = logos[teamId]
  if (img) {
    const pad = Math.max(2, Math.round(size * 0.12))
    chip.setPadding(pad, pad, pad, pad)
    const i = chip.addImage(img)
    i.imageSize = new Size(size - pad * 2, size - pad * 2)
    i.resizable = true
  } else {
    const abbr = TEAM_SHORT[teamId] ?? teamId.slice(0, 3).toUpperCase()
    const lbl = (size < 24) ? abbr.slice(0, 2) : abbr
    const t = chip.addText(lbl)
    t.font = Font.boldSystemFont(Math.max(6, Math.round(size * 0.3)))
    t.textColor = C.white
    t.centerAlignText()
  }
}

// Score pill: "NEP 8 – 3 PIR"
function addScoreLine(parent, g, fontSize = 10) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  const awayWon = (g.away_score ?? 0) > (g.home_score ?? 0)
  const homeWon = (g.home_score ?? 0) > (g.away_score ?? 0)

  const a = row.addText(TEAM_SHORT[g.away_team_id] ?? "???")
  a.font = Font.boldSystemFont(fontSize)
  a.textColor = awayWon ? C.white : C.dim

  const sc = row.addText(`  ${g.away_score}–${g.home_score}  `)
  sc.font = Font.boldSystemFont(fontSize + 1)
  sc.textColor = C.accent

  const h = row.addText(TEAM_SHORT[g.home_team_id] ?? "???")
  h.font = Font.boldSystemFont(fontSize)
  h.textColor = homeWon ? C.white : C.dim

  return row
}

// ══════════════════════════════════════════════════════════
//  SMALL WIDGET — koploper
// ══════════════════════════════════════════════════════════
async function buildSmall(standings, upcoming, live, logos) {
  const w = new ListWidget()
  w.backgroundColor = C.bg
  w.setPadding(12, 14, 12, 14)
  w.url = "https://honkbalhoofdklasse.com/stand"
  w.refreshAfterDate = new Date(Date.now() + 20 * 60 * 1000)

  const leader = standings[0]
  if (!leader) {
    const t = w.addText("Geen data")
    t.textColor = C.muted
    t.font = Font.systemFont(12)
    return w
  }

  // ── Header ──
  const hdr = w.addStack()
  hdr.layoutHorizontally()
  hdr.centerAlignContent()
  const dot = hdr.addText("● ")
  dot.font = Font.systemFont(7)
  dot.textColor = C.accent
  const hl = hdr.addText("HOOFDKLASSE")
  hl.font = Font.boldSystemFont(7)
  hl.textColor = C.muted
  hdr.addSpacer()

  // Live indicator
  if (live.length > 0) {
    const liveDot = hdr.addText("● LIVE")
    liveDot.font = Font.boldSystemFont(7)
    liveDot.textColor = new Color("#22c55e")
  }

  w.addSpacer(8)

  // ── Leader card ──
  const leaderRow = w.addStack()
  leaderRow.layoutHorizontally()
  leaderRow.centerAlignContent()

  addLogoChip(leaderRow, leader.team_id, logos, 38)
  leaderRow.addSpacer(10)

  const nameCol = leaderRow.addStack()
  nameCol.layoutVertically()
  const rankT = nameCol.addText("#1 LEIDER")
  rankT.font = Font.boldSystemFont(7)
  rankT.textColor = C.accent
  nameCol.addSpacer(2)
  const nameT = nameCol.addText(TEAM_NAME[leader.team_id] ?? leader.team_id)
  nameT.font = Font.blackSystemFont(14)
  nameT.textColor = C.white
  nameT.lineLimit = 1

  w.addSpacer(10)

  // ── Stats ──
  const statsRow = w.addStack()
  statsRow.layoutHorizontally()
  statsRow.centerAlignContent()
  statsRow.spacing = 0

  function addStat(val, lbl) {
    const col = statsRow.addStack()
    col.layoutVertically()
    col.centerAlignContent()
    const v = col.addText(String(val))
    v.font = Font.blackSystemFont(20)
    v.textColor = C.white
    const l = col.addText(lbl)
    l.font = Font.boldSystemFont(7)
    l.textColor = C.muted
  }

  addStat(leader.wins, "W")
  statsRow.addSpacer(14)
  addStat(leader.losses, "L")
  statsRow.addSpacer(14)
  addStat(fmtPct(leader.wins, leader.losses), "PCT")

  w.addSpacer()

  // ── Next game ──
  const next = upcoming[0]
  if (next) {
    addHLine(w)
    w.addSpacer(5)
    const nr = w.addStack()
    nr.layoutHorizontally()
    nr.centerAlignContent()
    const nl = nr.addText("Next  ")
    nl.font = Font.systemFont(7)
    nl.textColor = C.muted
    const nd = nr.addText(fmtDate(next.game_date))
    nd.font = Font.boldSystemFont(7)
    nd.textColor = C.accent
    if (next.game_time) {
      const nt2 = nr.addText(`  ${fmtTime(next.game_time)}`)
      nt2.font = Font.systemFont(7)
      nt2.textColor = C.dim
    }
    w.addSpacer(3)
    const mr = w.addStack()
    mr.layoutHorizontally()
    mr.centerAlignContent()
    const aw = mr.addText(TEAM_SHORT[next.away_team_id] ?? "???")
    aw.font = Font.boldSystemFont(10)
    aw.textColor = C.white
    const vs = mr.addText(" vs ")
    vs.font = Font.systemFont(9)
    vs.textColor = C.muted
    const hw = mr.addText(TEAM_SHORT[next.home_team_id] ?? "???")
    hw.font = Font.boldSystemFont(10)
    hw.textColor = C.white
  }

  return w
}

// ══════════════════════════════════════════════════════════
//  MEDIUM WIDGET — top 4 + volgende wedstrijden
// ══════════════════════════════════════════════════════════
async function buildMedium(standings, upcoming, recent, live, logos) {
  const w = new ListWidget()
  w.backgroundColor = C.bg
  w.setPadding(12, 14, 12, 14)
  w.url = "https://honkbalhoofdklasse.com"
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

  const main = w.addStack()
  main.layoutHorizontally()
  main.centerAlignContent()
  main.spacing = 0

  // ── LEFT: top 4 ──────────────────────────────────────────
  const left = main.addStack()
  left.layoutVertically()
  left.size = new Size(185, 0)

  // Header
  const lhdr = left.addStack()
  lhdr.layoutHorizontally()
  lhdr.centerAlignContent()
  const ld = lhdr.addText("● ")
  ld.font = Font.systemFont(7)
  ld.textColor = C.accent
  const lt = lhdr.addText("STAND 2026")
  lt.font = Font.boldSystemFont(8)
  lt.textColor = C.muted
  lhdr.addSpacer()
  if (live.length > 0) {
    const lv = lhdr.addText("LIVE")
    lv.font = Font.boldSystemFont(7)
    lv.textColor = new Color("#22c55e")
  }

  left.addSpacer(6)

  // Column headers
  const chdr = left.addStack()
  chdr.layoutHorizontally()
  chdr.centerAlignContent()
  const ch1 = chdr.addText("  #   TEAM")
  ch1.font = Font.boldSystemFont(7)
  ch1.textColor = new Color("#2a3f5a")
  chdr.addSpacer()
  const ch2 = chdr.addText("W–L    PCT")
  ch2.font = Font.boldSystemFont(7)
  ch2.textColor = new Color("#2a3f5a")

  left.addSpacer(3)
  addHLine(left, 0.3)
  left.addSpacer(3)

  for (let i = 0; i < Math.min(4, standings.length); i++) {
    const s = standings[i]
    const isTop = i === 0

    if (i > 0) left.addSpacer(3)

    const row = left.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()
    if (isTop) {
      row.backgroundColor = new Color(TEAM_COLOR[s.team_id] ?? "#fe3d00", 0.18)
      row.cornerRadius = 5
      row.setPadding(2, 4, 2, 4)
    } else {
      row.setPadding(1, 2, 1, 2)
    }

    // Rank
    const rk = row.addText(String(i + 1))
    rk.font = Font.boldSystemFont(isTop ? 10 : 9)
    rk.textColor = isTop ? C.accent : C.muted
    row.addSpacer(5)

    // Logo
    addLogoChip(row, s.team_id, logos, 20)
    row.addSpacer(5)

    // Name
    const nm = row.addText(TEAM_NAME[s.team_id] ?? s.team_id)
    nm.font = isTop ? Font.boldSystemFont(10) : Font.systemFont(10)
    nm.textColor = C.white
    nm.lineLimit = 1
    row.addSpacer()

    // W-L
    const wl = row.addText(`${s.wins}–${s.losses}`)
    wl.font = Font.systemFont(9)
    wl.textColor = C.dim
    row.addSpacer(5)

    // PCT
    const pc = row.addText(fmtPct(s.wins, s.losses))
    pc.font = Font.boldSystemFont(9)
    pc.textColor = isTop ? C.accent : C.white
  }

  // Remaining teams count
  if (standings.length > 4) {
    left.addSpacer(4)
    const more = left.addText(`+${standings.length - 4} teams → honkbalhoofdklasse.com`)
    more.font = Font.systemFont(7)
    more.textColor = new Color("#2a3f5a")
  }

  // ── VERTICAL DIVIDER ─────────────────────────────────────
  main.addSpacer(10)
  const divCol = main.addStack()
  divCol.backgroundColor = C.border
  divCol.size = new Size(1, 130)
  divCol.addSpacer()
  main.addSpacer(10)

  // ── RIGHT: volgende wedstrijden ───────────────────────────
  const right = main.addStack()
  right.layoutVertically()

  addLabel(right, "VOLGENDE")
  right.addSpacer(5)

  if (upcoming.length === 0) {
    const nt = right.addText("Geen\nwedstrijden")
    nt.font = Font.systemFont(9)
    nt.textColor = C.muted
  } else {
    for (let i = 0; i < Math.min(2, upcoming.length); i++) {
      const g = upcoming[i]
      if (i > 0) { right.addSpacer(6); addHLine(right, 0.2); right.addSpacer(4) }

      // Away
      const aRow = right.addStack()
      aRow.layoutHorizontally()
      aRow.centerAlignContent()
      addLogoChip(aRow, g.away_team_id, logos, 20)
      aRow.addSpacer(5)
      const an = aRow.addText(TEAM_NAME[g.away_team_id] ?? "???")
      an.font = Font.boldSystemFont(9)
      an.textColor = C.white
      an.lineLimit = 1

      right.addSpacer(2)

      // Home
      const hRow = right.addStack()
      hRow.layoutHorizontally()
      hRow.centerAlignContent()
      addLogoChip(hRow, g.home_team_id, logos, 20)
      hRow.addSpacer(5)
      const hn = hRow.addText(TEAM_NAME[g.home_team_id] ?? "???")
      hn.font = Font.boldSystemFont(9)
      hn.textColor = C.white
      hn.lineLimit = 1

      right.addSpacer(3)

      const dRow = right.addStack()
      dRow.layoutHorizontally()
      dRow.centerAlignContent()
      const dateT = dRow.addText(fmtDate(g.game_date))
      dateT.font = Font.boldSystemFont(8)
      dateT.textColor = C.accent
      if (g.game_time) {
        const timeT = dRow.addText(`  ${fmtTime(g.game_time)}`)
        timeT.font = Font.systemFont(8)
        timeT.textColor = C.dim
      }
    }
  }

  right.addSpacer()

  // Laatste uitslag
  if (recent.length > 0) {
    addHLine(right, 0.3)
    right.addSpacer(4)
    addLabel(right, "LAATSTE")
    right.addSpacer(3)
    addScoreLine(right, recent[0], 9)
    const dr = right.addText(fmtDate(recent[0].game_date))
    dr.font = Font.systemFont(7)
    dr.textColor = C.muted
  }

  return w
}

// ══════════════════════════════════════════════════════════
//  LARGE WIDGET — volledige stand + uitslagen + next games
// ══════════════════════════════════════════════════════════
async function buildLarge(standings, upcoming, recent, live, logos) {
  const w = new ListWidget()
  w.backgroundColor = C.bg
  w.setPadding(14, 16, 14, 16)
  w.url = "https://honkbalhoofdklasse.com"
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

  // ── Header ──────────────────────────────────────────────
  const hdr = w.addStack()
  hdr.layoutHorizontally()
  hdr.centerAlignContent()

  const dot = hdr.addText("● ")
  dot.font = Font.systemFont(8)
  dot.textColor = C.accent
  const ht = hdr.addText("HONKBAL HOOFDKLASSE")
  ht.font = Font.boldSystemFont(9)
  ht.textColor = C.white
  hdr.addSpacer()

  if (live.length > 0) {
    const lv = hdr.addText(`● ${live.length} LIVE`)
    lv.font = Font.boldSystemFont(8)
    lv.textColor = new Color("#22c55e")
  } else {
    const hd = hdr.addText(new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }))
    hd.font = Font.systemFont(8)
    hd.textColor = C.muted
  }

  w.addSpacer(8)

  // ── Stand 2026 ───────────────────────────────────────────
  const standHdr = w.addStack()
  standHdr.layoutHorizontally()
  standHdr.centerAlignContent()
  addLabel(standHdr, "STAND 2026")
  standHdr.addSpacer()
  // Column labels
  const colHdr = standHdr.addText("  W   L    PCT   GP")
  colHdr.font = Font.boldSystemFont(7)
  colHdr.textColor = new Color("#253650")

  w.addSpacer(4)
  addHLine(w)
  w.addSpacer(2)

  for (let i = 0; i < standings.length; i++) {
    const s = standings[i]
    const isTop = i === 0

    if (i > 0) w.addSpacer(1)

    const row = w.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()

    if (isTop) {
      row.backgroundColor = new Color(TEAM_COLOR[s.team_id] ?? "#fe3d00", 0.15)
      row.cornerRadius = 5
      row.setPadding(3, 6, 3, 6)
    } else {
      row.setPadding(2, 2, 2, 2)
    }

    // Rank
    const rk = row.addText(String(i + 1))
    rk.font = Font.boldSystemFont(isTop ? 11 : 10)
    rk.textColor = isTop ? C.accent : C.muted
    rk.minimumScaleFactor = 1
    row.addSpacer(6)

    // Logo chip
    addLogoChip(row, s.team_id, logos, isTop ? 22 : 19)
    row.addSpacer(7)

    // Name
    const nm = row.addText(TEAM_NAME[s.team_id] ?? s.team_id)
    nm.font = isTop ? Font.boldSystemFont(11) : Font.systemFont(10)
    nm.textColor = C.white
    nm.lineLimit = 1
    row.addSpacer()

    // Stats (fixed width columns)
    function col(val, width, bold, color) {
      const st = row.addStack()
      st.size = new Size(width, 0)
      st.centerAlignContent()
      const t = st.addText(String(val))
      t.font = bold ? Font.boldSystemFont(10) : Font.systemFont(10)
      t.textColor = color ?? C.white
      return t
    }

    col(s.wins,  24, isTop, isTop ? C.white : C.white)
    col(s.losses, 24, false, C.dim)
    col(fmtPct(s.wins, s.losses), 36, true, isTop ? C.accent : C.dim)
    col(s.games_played + "G", 28, false, new Color("#253650"))
  }

  w.addSpacer(8)
  addHLine(w)
  w.addSpacer(8)

  // ── Bottom: laatste uitslagen + volgende wedstrijden ─────
  const bottom = w.addStack()
  bottom.layoutHorizontally()
  bottom.spacing = 0

  // ── RESULTS ──
  const resCol = bottom.addStack()
  resCol.layoutVertically()

  addLabel(resCol, "LAATSTE UITSLAGEN")
  resCol.addSpacer(5)

  for (let i = 0; i < Math.min(3, recent.length); i++) {
    const g = recent[i]
    if (i > 0) resCol.addSpacer(4)

    const rRow = resCol.addStack()
    rRow.layoutHorizontally()
    rRow.centerAlignContent()

    addLogoChip(rRow, g.away_team_id, logos, 18)
    rRow.addSpacer(4)

    const awayWon = (g.away_score ?? 0) > (g.home_score ?? 0)
    const homeWon = (g.home_score ?? 0) > (g.away_score ?? 0)

    const sc = rRow.addText(`${g.away_score}–${g.home_score}`)
    sc.font = Font.boldSystemFont(11)
    sc.textColor = C.accent
    rRow.addSpacer(4)

    addLogoChip(rRow, g.home_team_id, logos, 18)
    rRow.addSpacer(5)

    const dt = rRow.addText(fmtDate(g.game_date))
    dt.font = Font.systemFont(8)
    dt.textColor = C.muted
  }

  if (recent.length === 0) {
    const nt = resCol.addText("Geen recente\nuitslagen")
    nt.font = Font.systemFont(9)
    nt.textColor = C.muted
  }

  bottom.addSpacer()

  // Vertical divider
  const vdiv = bottom.addStack()
  vdiv.backgroundColor = C.border
  vdiv.size = new Size(1, 90)
  vdiv.addSpacer()

  bottom.addSpacer(12)

  // ── NEXT GAMES ──
  const nextCol = bottom.addStack()
  nextCol.layoutVertically()

  addLabel(nextCol, "VOLGENDE")
  nextCol.addSpacer(5)

  if (upcoming.length === 0) {
    const nt = nextCol.addText("Geen\nwedstrijden")
    nt.font = Font.systemFont(9)
    nt.textColor = C.muted
  } else {
    for (let i = 0; i < Math.min(3, upcoming.length); i++) {
      const g = upcoming[i]
      if (i > 0) { nextCol.addSpacer(4); addHLine(nextCol, 0.2); nextCol.addSpacer(4) }

      const ng = nextCol.addStack()
      ng.layoutHorizontally()
      ng.centerAlignContent()
      addLogoChip(ng, g.away_team_id, logos, 18)
      ng.addSpacer(3)
      const vs2 = ng.addText("vs")
      vs2.font = Font.systemFont(8)
      vs2.textColor = C.muted
      ng.addSpacer(3)
      addLogoChip(ng, g.home_team_id, logos, 18)
      ng.addSpacer(5)

      const info = nextCol.addStack()
      info.layoutHorizontally()
      info.centerAlignContent()
      const dn = info.addText(fmtDate(g.game_date))
      dn.font = Font.boldSystemFont(8)
      dn.textColor = C.accent
      if (g.game_time) {
        const tn = info.addText(`  ${fmtTime(g.game_time)}`)
        tn.font = Font.systemFont(8)
        tn.textColor = C.dim
      }
    }
  }

  return w
}

// ══════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════
async function run() {
  try {
    // Fetch all data in parallel
    const [standings, recent, upcoming, live, logos] = await Promise.all([
      fetchStandings(),
      fetchRecentGames(3),
      fetchUpcoming(3),
      fetchLive(),
      loadAllLogos(),
    ])

    const family = config.widgetFamily ?? "large"
    let widget

    if (family === "small") {
      widget = await buildSmall(standings, upcoming, live, logos)
    } else if (family === "medium") {
      widget = await buildMedium(standings, upcoming, recent, live, logos)
    } else {
      widget = await buildLarge(standings, upcoming, recent, live, logos)
    }

    Script.setWidget(widget)

    // Preview in-app (cycle through sizes by running multiple times)
    if (!config.runsInWidget) {
      if (family === "small")       await widget.presentSmall()
      else if (family === "medium") await widget.presentMedium()
      else                          await widget.presentLarge()
    }
  } catch (err) {
    const ew = new ListWidget()
    ew.backgroundColor = C.bg
    ew.setPadding(14, 14, 14, 14)
    const t1 = ew.addText("⚠️ Laad-fout")
    t1.font = Font.boldSystemFont(12)
    t1.textColor = Color.red()
    ew.addSpacer(6)
    const t2 = ew.addText(String(err).slice(0, 100))
    t2.font = Font.systemFont(9)
    t2.textColor = C.muted
    Script.setWidget(ew)
    if (!config.runsInWidget) await ew.presentSmall()
  }
}

run()
