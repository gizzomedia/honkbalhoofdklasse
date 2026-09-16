export const MAX_SAVE_BYTES = 16_000_000
export function validateSaveEnvelope(body: unknown, slot: number) {
  if (!Number.isInteger(slot) || slot < 1 || slot > 3 || !body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (typeof b.payload !== 'string' || new TextEncoder().encode(b.payload).length > MAX_SAVE_BYTES ||
      !Number.isSafeInteger(b.revision) || (b.revision as number) < 0 ||
      b.engineVersion !== '0.6.1' || b.formatVersion !== 1) return false
  try {
    // Read metadata only. The original string is stored unchanged, never stringify(career).
    const career = JSON.parse(b.payload)
    return career.slot === slot && Number.isInteger(career.year) && career.year >= 2026 &&
      Number.isInteger(career.user) && career.user >= 0 && career.user < 7 &&
      Number.isInteger(career.day) && Array.isArray(career.players) && career.players.length > 0 &&
      career.players.length < 2000 && Array.isArray(career.clubs) && career.clubs.length === 7 &&
      Array.isArray(career.schedule) && career.schedule.length < 5000
  } catch { return false }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !!origin && origin === new URL(request.url).origin
}
