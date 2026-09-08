import { it, expect, vi } from 'vitest'
import { drawDeck, grammarQueue, quizFor, type Vocab } from './questions'
const vocab: Vocab[] = Array.from({ length: 30 }, (_, i) => ({
  w: String(i),
  r: `音${i}`,
  zh: '字',
  en: 'word',
}))
it('prioritizes learning then fresh without duplicates', () => {
  const learning = Object.fromEntries(vocab.slice(0, 12).map((v) => [v.w, true as const]))
  expect(drawDeck(vocab, {}, learning).every((v) => learning[v.w])).toBe(true)
  const deck = drawDeck(vocab, { '0': true }, { '1': true })
  expect(deck[0].w).toBe('1')
  expect(deck.some((v) => v.w === '0')).toBe(false)
  expect(new Set(deck.map((v) => v.w)).size).toBe(10)
})
it('uses stable IDs to queue unmastered before mastered', () => {
  const items = ['a', 'b', 'c'].map((id) => ({
    id,
    q: '',
    answer: '',
    distractors: [],
    explanation: '',
  }))
  expect(grammarQueue(items, ['b']).at(-1)?.id).toBe('b')
  expect(grammarQueue([...items].reverse(), ['b']).at(-1)?.id).toBe('b')
})
it('quiz readings are four unique readings from the same bank', () => {
  const q = quizFor([...vocab, ...vocab])
  expect(q.options).toHaveLength(4)
  expect(new Set(q.options).size).toBe(4)
  expect(q.options).toContain(q.item.r)
  expect(q.options.every((r) => vocab.some((v) => v.r === r))).toBe(true)
})
it.each([
  ['きゅう', 'く'],
  ['く', 'きゅう'],
])('excludes the other reading of 九 when testing %s', (reading, otherReading) => {
  const bank: Vocab[] = [
    { w: '九', r: reading, zh: '九', en: 'nine' },
    { w: '九', r: otherReading, zh: '九', en: 'nine' },
    { w: '一', r: 'いち', zh: '一', en: 'one' },
    { w: '二', r: 'に', zh: '二', en: 'two' },
    { w: '三', r: 'さん', zh: '三', en: 'three' },
  ]
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.999).mockReturnValueOnce(0)
  try {
    const quiz = quizFor(bank)
    expect(quiz.item).toEqual(bank[0])
    expect(quiz.options).not.toContain(otherReading)
    expect(quiz.options).toHaveLength(4)
    expect(new Set(quiz.options)).toEqual(new Set([reading, 'いち', 'に', 'さん']))
  } finally {
    random.mockRestore()
  }
})
