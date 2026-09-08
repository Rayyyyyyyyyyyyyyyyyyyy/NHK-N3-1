import { LEVELS, mapLevels, type Level, type LevelMap } from '../domain/progress/state'
import { BANK_KINDS, type BankKind, type Banks } from '../domain/questions'
export type Counts = LevelMap<Record<BankKind, number | null>>
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')
function question(v: unknown): boolean {
  return (
    object(v) &&
    typeof v.q === 'string' &&
    typeof v.answer === 'string' &&
    strings(v.distractors) &&
    v.distractors.length === 3 &&
    new Set([v.answer, ...v.distractors]).size === 4 &&
    typeof v.explanation === 'string'
  )
}
function valid(kind: BankKind, v: unknown): boolean {
  if (!object(v)) return false
  if (kind === 'vocab')
    return (
      ['w', 'r'].every((k) => typeof v[k] === 'string') &&
      ['zh', 'en'].every((k) => v[k] === undefined || typeof v[k] === 'string')
    )
  if (kind === 'grammar') return typeof v.id === 'string' && question(v)
  if (!LEVELS.includes(v.level as Level) || typeof v.id !== 'string') return false
  if (kind === 'listening') return typeof v.script === 'string' && question(v)
  return (
    ['title', 'type', 'text'].every((k) => typeof v[k] === 'string') &&
    Array.isArray(v.notes) &&
    v.notes.every(
      (n) => object(n) && typeof n.term === 'string' && typeof n.meaning === 'string',
    ) &&
    Array.isArray(v.questions) &&
    v.questions.every(question)
  )
}
export function createQuestionBank(
  fetcher: typeof fetch = globalThis.fetch,
  base = import.meta.env.BASE_URL,
) {
  const cache = new Map<string, unknown[]>(),
    pending = new Map<string, Promise<unknown[] | null>>()
  async function resource(kind: BankKind, level: Level): Promise<unknown[] | null> {
    const file = kind === 'vocab' || kind === 'grammar' ? `${kind}-${level}.json` : `${kind}.json`
    if (cache.has(file)) return cache.get(file)!
    if (pending.has(file)) return pending.get(file)!
    const request = (async () => {
      try {
        const res = await fetcher(`${base}data/${file}`)
        if (!res.ok) throw Error()
        const items: unknown = await res.json()
        if (!Array.isArray(items) || !items.every((x) => valid(kind, x))) throw Error()
        cache.set(file, items)
        return items
      } catch {
        return null
      } finally {
        pending.delete(file)
      }
    })()
    pending.set(file, request)
    return request
  }
  async function load<K extends BankKind>(
    kind: K,
    level: Level,
  ): Promise<{ items: Banks[K][]; failed: boolean }> {
    const raw = await resource(kind, level)
    const items = (raw ?? []) as Banks[K][]
    return {
      items:
        kind === 'reading' || kind === 'listening'
          ? items.filter((x) => (x as Banks['reading']).level === level)
          : items,
      failed: raw === null,
    }
  }
  async function counts(): Promise<Counts> {
    try {
      const r = await fetcher(`${base}data/counts.json`)
      if (!r.ok) throw Error()
      const p: unknown = await r.json()
      if (
        !object(p) ||
        !LEVELS.every((lv) => {
          const entry = p[lv]
          return (
            object(entry) &&
            BANK_KINDS.every((k) => {
              const count = entry[k]
              return typeof count === 'number' && Number.isInteger(count) && count >= 0
            })
          )
        })
      )
        throw Error()
      return p as Counts
    } catch {
      const counts: Counts = mapLevels(() => ({
        vocab: null,
        grammar: null,
        reading: null,
        listening: null,
      }))
      await Promise.all(
        LEVELS.flatMap((lv) =>
          BANK_KINDS.map(async (kind) => {
            const result = await load(kind, lv)
            counts[lv][kind] = result.failed ? null : result.items.length
          }),
        ),
      )
      return counts
    }
  }
  return { load, counts }
}
export const questionBank = createQuestionBank()
