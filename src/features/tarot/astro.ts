import * as path from 'node:path'

// Lazy import to avoid SSR issues; Vite dev endpoint runs in Node
let swe: any | null = null
async function loadSweph(): Promise<any> {
  if (swe) return swe
  const mod = await import('sweph')
  swe = mod as any
  try {
    const eph = path.join(process.cwd(), 'public', 'sweph')
    // Correct API per sweph typings
    swe.set_ephe_path?.(eph)
  } catch {}
  return swe
}

const ZODIAC = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'] as const
export type Zodiac = typeof ZODIAC[number]

export function longitudeToZodiac(longitude: number): { sign: Zodiac; degree: number } {
  const norm = ((longitude % 360) + 360) % 360
  const idx = Math.floor(norm / 30)
  const deg = norm - idx * 30
  return { sign: ZODIAC[idx] as Zodiac, degree: deg }
}

export async function getSunMoonForUnix(unix: number): Promise<{ sun: { sign: Zodiac; degree: number }; moon: { sign: Zodiac; degree: number } }> {
  const s = await loadSweph()
  const c = s.constants
  const d = new Date(unix * 1000)
  // Build UTC components
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const hour = d.getUTCHours()
  const minute = d.getUTCMinutes()
  const second = d.getUTCSeconds() + (d.getUTCMilliseconds() / 1000)
  const jd = s.utc_to_jd(year, month, day, hour, minute, second, c.SE_GREG_CAL)
  const flags = c.SEFLG_SWIEPH
  const sunRes = s.calc_ut(jd.jd_ut, c.SE_SUN, flags)
  const moonRes = s.calc_ut(jd.jd_ut, c.SE_MOON, flags)
  const sunLon = Array.isArray(sunRes?.data) ? Number(sunRes.data[0]) : 0
  const moonLon = Array.isArray(moonRes?.data) ? Number(moonRes.data[0]) : 0
  return {
    sun: longitudeToZodiac(sunLon),
    moon: longitudeToZodiac(moonLon),
  }
}


