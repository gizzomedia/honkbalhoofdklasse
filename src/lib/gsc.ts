import crypto from 'crypto'

// Google Search Console — Search Analytics via service account (JWT, no OAuth flow)
//
// Setup (one time):
//  1. Google Cloud → create project → enable "Google Search Console API"
//  2. Create a Service Account → create a JSON key → download it
//  3. In Search Console → Settings → Users and permissions → add the service
//     account email (xxx@yyy.iam.gserviceaccount.com) as a Full/Restricted user
//  4. Put the whole JSON key in the Vercel env var GSC_SERVICE_ACCOUNT (one line)

const SITE_URL = 'sc-domain:honkbalhoofdklasse.com'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

type ServiceAccount = { client_email: string; private_key: string }

function getServiceAccount(): ServiceAccount {
  const raw = process.env.GSC_SERVICE_ACCOUNT
  if (!raw) throw new Error('GSC_SERVICE_ACCOUNT not configured')
  const json = JSON.parse(raw) as ServiceAccount
  // Vercel sometimes escapes newlines in the private key
  json.private_key = json.private_key.replace(/\\n/g, '\n')
  return json
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

let cachedToken: { token: string; exp: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token

  const sa = getServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const signingInput = `${header}.${claim}`
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(sa.private_key)
  const jwt = `${signingInput}.${base64url(signature)}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`)
  const data = await res.json() as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

async function query(body: Record<string, unknown>): Promise<GscRow[]> {
  const token = await getAccessToken()
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      next: { revalidate: 3600 },
    },
  )
  if (!res.ok) throw new Error(`query ${res.status}: ${await res.text()}`)
  const data = await res.json() as { rows?: GscRow[] }
  return data.rows ?? []
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export type GscTotals = { clicks: number; impressions: number; ctr: number; position: number }
export type GscData = {
  totals: GscTotals
  timeseries: { date: string; clicks: number; impressions: number }[]
  queries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[]
  pages: { page: string; clicks: number; impressions: number; ctr: number; position: number }[]
  countries: { country: string; clicks: number; impressions: number }[]
  devices: { device: string; clicks: number; impressions: number }[]
}

export async function fetchGscData(days: number): Promise<GscData> {
  const endDate = new Date(Date.now() - 2 * 86400000) // GSC data lags ~2 days
  const startDate = new Date(endDate.getTime() - (days - 1) * 86400000)
  const range = { startDate: fmtDate(startDate), endDate: fmtDate(endDate) }

  const [totalsRows, dateRows, queryRows, pageRows, countryRows, deviceRows] = await Promise.all([
    query({ ...range }),
    query({ ...range, dimensions: ['date'] }),
    query({ ...range, dimensions: ['query'], rowLimit: 25 }),
    query({ ...range, dimensions: ['page'], rowLimit: 25 }),
    query({ ...range, dimensions: ['country'], rowLimit: 15 }),
    query({ ...range, dimensions: ['device'] }),
  ])

  const t = totalsRows[0]
  return {
    totals: {
      clicks: t?.clicks ?? 0,
      impressions: t?.impressions ?? 0,
      ctr: t?.ctr ?? 0,
      position: t?.position ?? 0,
    },
    timeseries: dateRows.map(r => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
    queries: queryRows.map(r => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    pages: pageRows.map(r => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    countries: countryRows.map(r => ({ country: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
    devices: deviceRows.map(r => ({ device: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
  }
}
