import { LEVELS, mapLevels, type Level, type LevelMap } from '../domain/progress/state'
import type { StudyItemRef } from '../domain/learning/types'
import { BANK_KINDS, type BankKind, type Banks } from '../domain/questions'
export type Counts = LevelMap<Record<BankKind, number | null>>
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim().length > 0)
function question(v: unknown): boolean {
  return (
    object(v) &&
    typeof v.q === 'string' &&
    v.q.trim().length > 0 &&
    typeof v.answer === 'string' &&
    v.answer.trim().length > 0 &&
    strings(v.distractors) &&
    v.distractors.length === 3 &&
    new Set([v.answer, ...v.distractors]).size === 4 &&
    typeof v.explanation === 'string' &&
    v.explanation.trim().length > 0
  )
}
function valid(kind: BankKind, v: unknown, level: Level): boolean {
  if (!object(v)) return false
  if (kind === 'vocab')
    return (
      ['w', 'r'].every((k) => typeof v[k] === 'string' && (v[k] as string).trim().length > 0) &&
      ['zh', 'en'].every((k) => typeof v[k] === 'string') &&
      ((v.zh as string).trim().length > 0 || (v.en as string).trim().length > 0)
    )
  if (kind === 'grammar')
    return typeof v.id === 'string' && new RegExp(`^g-${level}-\\d{3,}$`).test(v.id) && question(v)
  if (!LEVELS.includes(v.level as Level) || typeof v.id !== 'string' || !v.id.trim()) return false
  if (kind === 'listening')
    return typeof v.script === 'string' && v.script.trim().length > 0 && question(v)
  return (
    ['title', 'type', 'text'].every(
      (k) => typeof v[k] === 'string' && (v[k] as string).trim().length > 0,
    ) &&
    Array.isArray(v.notes) &&
    v.notes.every(
      (n) =>
        object(n) &&
        typeof n.term === 'string' &&
        n.term.trim().length > 0 &&
        typeof n.meaning === 'string' &&
        n.meaning.trim().length > 0,
    ) &&
    Array.isArray(v.questions) &&
    v.questions.length > 0 &&
    v.questions.every(
      (q) => object(q) && typeof q.id === 'string' && q.id.trim().length > 0 && question(q),
    )
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
        if (!Array.isArray(items) || !items.every((x) => valid(kind, x, level))) throw Error()
        if (
          kind !== 'vocab' &&
          new Set(items.map((x) => (x as { id: string }).id)).size !== items.length
        )
          throw Error()
        if (kind === 'reading') {
          const ids = items.flatMap((x) => (x as Banks['reading']).questions.map((q) => q.id))
          if (new Set(ids).size !== ids.length) throw Error()
        }
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
  async function resolve(ref: StudyItemRef) {
    const loaded = await load(ref.kind, ref.level)
    if (loaded.failed) return { status: 'error' as const }
    if (ref.kind === 'reading') {
      const article = (loaded.items as Banks['reading'][]).find((a) => a.id === ref.articleId)
      const item = article?.questions.find((q) => q.id === ref.id)
      return item && article
        ? { status: 'ready' as const, item, article }
        : { status: 'unavailable' as const }
    }
    const item = loaded.items.find((x) =>
      ref.kind === 'vocab'
        ? (x as Banks['vocab']).w === ref.id
        : (x as Banks['grammar']).id === ref.id,
    )
    return item ? { status: 'ready' as const, item } : { status: 'unavailable' as const }
  }
  return { load, counts, resolve }
}
export const questionBank = createQuestionBank()
