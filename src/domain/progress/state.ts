export const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'] as const
export type Level = (typeof LEVELS)[number]
export type LevelMap<T> = Record<Level, T>
export interface ProgressState {
  level: Level
  streak: number
  lastDate: string
  vKnown: LevelMap<Record<string, true>>
  vLearning: LevelMap<Record<string, true>>
  gDone: LevelMap<string[]>
  lDone: LevelMap<string[]>
  lCorrect: LevelMap<string[]>
  rDone: LevelMap<string[]>
}
export const mapLevels = <T>(make: (level: Level) => T): LevelMap<T> =>
  Object.fromEntries(LEVELS.map((lv) => [lv, make(lv)])) as LevelMap<T>
export function defaultState(): ProgressState {
  return {
    level: 'n5',
    streak: 0,
    lastDate: '',
    vKnown: mapLevels(() => ({})),
    vLearning: mapLevels(() => ({})),
    gDone: mapLevels(() => []),
    lDone: mapLevels(() => []),
    lCorrect: mapLevels(() => []),
    rDone: mapLevels(() => []),
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const PROGRESS_KEYS = ['vKnown', 'vLearning', 'gDone', 'lDone', 'lCorrect', 'rDone'] as const
// Archive shape guard is retained inside the explicitly versioned envelope.
export function isProgressPayload(v: unknown): v is Record<string, unknown> {
  return object(v) && PROGRESS_KEYS.some((k) => Array.isArray(v[k]) || object(v[k]))
}
export function normalize(value: unknown): ProgressState {
  const s = defaultState(),
    p = object(value) ? value : {}
  if (LEVELS.includes(p.level as Level)) s.level = p.level as Level
  if (typeof p.streak === 'number' && Number.isFinite(p.streak) && p.streak >= 0)
    s.streak = Math.floor(p.streak)
  if (typeof p.lastDate === 'string') s.lastDate = p.lastDate
  for (const lv of LEVELS) {
    for (const key of ['vKnown', 'vLearning'] as const) {
      const levels = p[key],
        words = object(levels) ? levels[lv] : undefined
      if (object(words))
        s[key][lv] = Object.fromEntries(
          Object.entries(words)
            .filter(([, v]) => v === true)
            .map(([key]) => [key, true as const]),
        )
    }
    for (const key of ['gDone', 'lDone', 'lCorrect', 'rDone'] as const) {
      const levels = p[key],
        ids = object(levels) ? levels[lv] : undefined
      if (Array.isArray(ids)) s[key][lv] = ids.filter((id): id is string => typeof id === 'string')
    }
  }
  return s
}
export function encodeCode(state: ProgressState): string {
  return btoa(encodeURIComponent(JSON.stringify({ version: 4, state })))
}
export function decodeCode(code: string): ProgressState {
  let p: unknown
  try {
    p = JSON.parse(decodeURIComponent(atob(code.trim())))
  } catch {
    throw Error('進度碼無法解碼，請確認內容完整。')
  }
  if (!object(p) || p.version !== 4) throw Error('不支援此版本的進度碼；新版無法匯入舊版進度。')
  if (!isProgressPayload(p.state)) throw Error('這不是有效的道場進度碼。')
  return normalize(p.state)
}
export function todayString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function touchStreak(s: ProgressState, today = todayString()): void {
  if (s.lastDate === today) return
  const diff = Math.round(
    (Date.parse(today + 'T00:00:00') - Date.parse(s.lastDate + 'T00:00:00')) / 86400000,
  )
  s.streak = diff === 1 ? s.streak + 1 : 1
  s.lastDate = today
}
