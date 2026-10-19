import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
// @ts-expect-error Native ESM protected-asset hashing utility.
import { digest, readingContent, byId } from '../../../tools/content-hash.mjs'
// @ts-expect-error The small ID tool is a native ESM build utility.
import { assignReadingIds } from '../../../tools/reading-ids.mjs'
it('adds only stable IDs to all original reading questions without changing their meaning', () => {
  const baseline = JSON.parse(readFileSync('tools/content-baseline.json', 'utf8')).reading
  const after = JSON.parse(readFileSync('public/data/reading.json', 'utf8')).filter(
    (a: { id: string }) => baseline.ids.includes(a.id),
  )
  expect(after).toHaveLength(baseline.count)
  expect(digest(readingContent(after))).toBe(baseline.hash)
  expect(
    digest(
      after
        .map((a: { questions: { id: string }[] }) => ({
          ...a,
          questions: [...a.questions].sort(byId),
        }))
        .sort(byId),
    ),
  ).toBe(baseline.identityHash)
  const copy = JSON.parse(JSON.stringify(after)),
    high = assignReadingIds(copy, 100)
  copy.reverse()
  copy[0].questions.reverse()
  expect(assignReadingIds(copy, high)).toBe(high)
  expect(
    new Set(copy.flatMap((a: { questions: { id: string }[] }) => a.questions.map((q) => q.id)))
      .size,
  ).toBe(after.reduce((n: number, a: { questions: unknown[] }) => n + a.questions.length, 0))
  copy[0].questions.push({ q: 'new' })
  const next = assignReadingIds(copy, high)
  expect(copy[0].questions.at(-1).id).toBe('rq-0100')
  copy[0].questions.pop()
  copy[0].questions.push({ q: 'another' })
  assignReadingIds(copy, next)
  expect(copy[0].questions.at(-1).id).toBe('rq-0101')
})
