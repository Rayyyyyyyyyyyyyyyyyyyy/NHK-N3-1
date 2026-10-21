import { LEVELS, mapLevels, type Level, type LevelMap } from '../domain/progress/state'
import type { StudyItemRef } from '../domain/learning/types'
import { BANK_KINDS, type BankKind, type Banks } from '../domain/questions'
import { assertBank, vocabCount } from '../domain/bankContract.mjs'
export type Counts = LevelMap<Record<BankKind, number | null>>
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
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
        assertBank(kind, items, level)
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
            counts[lv][kind] = result.failed
              ? null
              : kind === 'vocab'
                ? vocabCount(result.items as Banks['vocab'][])
                : result.items.length
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
