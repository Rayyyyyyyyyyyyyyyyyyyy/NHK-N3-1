import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
// @ts-expect-error Native ESM protected-asset hashing utility.
import { digest, byId } from '../../../tools/content-hash.mjs'
// @ts-expect-error Native ESM build-time contract utility.
import { checkData } from '../../../tools/data-contract.mjs'
const levels = ['n5', 'n4', 'n3', 'n2', 'n1']
const read = (name: string) => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8'))
const baseline = JSON.parse(readFileSync('tools/content-baseline.json', 'utf8'))
const banks = () => ({
  vocab: Object.fromEntries(levels.map((lv) => [lv, read(`vocab-${lv}`)])),
  grammar: Object.fromEntries(levels.map((lv) => [lv, read(`grammar-${lv}`)])),
  reading: read('reading'),
  listening: read('listening'),
})
it('preserves original assets against the fixed baseline captured before this change', () => {
  for (const lv of levels) {
    const vocab = read(`vocab-${lv}`),
      grammar = read(`grammar-${lv}`),
      base = baseline.grammar[lv]
    expect(vocab).toHaveLength(baseline.vocab[lv].count)
    expect(digest(vocab)).toBe(baseline.vocab[lv].hash)
    const original = grammar.filter((q: { id: string }) => base.ids.includes(q.id))
    expect(original).toHaveLength(base.count)
    expect(digest(original.sort(byId))).toBe(base.hash)
    if (['n5', 'n4'].includes(lv)) expect(grammar).toHaveLength(base.count)
  }
  const listening = read('listening'),
    original = listening.filter((q: { id: string }) => baseline.listening.ids.includes(q.id))
  expect(original).toHaveLength(baseline.listening.count)
  expect(digest(original.sort(byId))).toBe(baseline.listening.hash)
  for (const lv of ['n5', 'n4']) {
    expect(read('reading').filter((a: { level: string }) => a.level === lv)).toHaveLength(
      baseline.reading.levels[lv],
    )
    expect(listening.filter((q: { level: string }) => q.level === lv)).toHaveLength(
      baseline.listening.levels[lv],
    )
  }
})
it('matches required N3/N2/N1 expansion with original sources and at least two questions per new article', () => {
  const data = banks(),
    counts = checkData(data, read('counts'))
  for (const [level, g, r, l] of [
    ['n3', 30, 3, 7],
    ['n2', 40, 4, 7],
    ['n1', 25, 3, 6],
  ] as const) {
    expect(counts[level]).toMatchObject({ grammar: g, reading: r, listening: l })
    expect(
      data.grammar[level].filter(
        (q: { id: string }) => !baseline.grammar[level].ids.includes(q.id),
      ),
    ).toHaveLength(10)
    expect(
      data.grammar[level]
        .filter((q: { id: string }) => !baseline.grammar[level].ids.includes(q.id))
        .every((q: { source: string }) => q.source.includes('原創')),
    ).toBe(true)
  }
  const newReading = data.reading.filter(
    (a: { id: string }) => !baseline.reading.ids.includes(a.id),
  )
  expect(newReading).toHaveLength(6)
  expect(
    newReading.every(
      (a: { questions: unknown[]; source: string }) =>
        a.questions.length >= 2 && a.source.includes('非 JLPT 官方'),
    ),
  ).toBe(true)
  expect(
    data.listening.filter((q: { id: string }) => !baseline.listening.ids.includes(q.id)),
  ).toHaveLength(9)
})
it.each([
  'duplicate-subquestion',
  'empty-article',
  'stale-counts',
  'invalid-level',
  'blank-script',
  'duplicate-option',
])('data check fails for %s', (mode) => {
  const data = banks(),
    counts = read('counts')
  if (mode === 'duplicate-subquestion')
    data.reading[0].questions[1].id = data.reading[0].questions[0].id
  if (mode === 'empty-article') data.reading[0].questions = []
  if (mode === 'stale-counts') counts.n3.grammar--
  if (mode === 'invalid-level') data.listening[0].level = 'n6'
  if (mode === 'blank-script') data.listening[0].script = ' '
  if (mode === 'duplicate-option') data.grammar.n3[0].distractors[0] = data.grammar.n3[0].answer
  expect(() => checkData(data, counts)).toThrow()
})
