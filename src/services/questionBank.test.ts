import { it, expect, vi } from 'vitest'
import { createQuestionBank } from './questionBank'
const response = (data: unknown) => ({ ok: true, json: async () => data }) as Response
it('retries a failure and caches only success', async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(Error())
    .mockResolvedValue(response([{ w: '水', r: 'みず', zh: '水', en: 'water' }]))
  const bank = createQuestionBank(fetcher, '/repo/')
  expect((await bank.load('vocab', 'n3')).failed).toBe(true)
  expect((await bank.load('vocab', 'n3')).items).toHaveLength(1)
  await bank.load('vocab', 'n3')
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher).toHaveBeenLastCalledWith('/repo/data/vocab-n3.json')
})
it('loads no other level for a vocabulary request', async () => {
  const fetcher = vi.fn().mockResolvedValue(response([]))
  await createQuestionBank(fetcher).load('vocab', 'n3')
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][0]).toContain('vocab-n3.json')
})
it('counts fallback computes totals and distinguishes failure from zero', async () => {
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes('counts') || url.includes('grammar-n2')) throw Error()
    if (url.includes('vocab')) return response([{ w: '水', r: 'みず', zh: '水', en: 'water' }])
    return response([])
  })
  const c = await createQuestionBank(fetcher as typeof fetch).counts()
  expect(c.n3.vocab).toBe(1)
  expect(c.n3.grammar).toBe(0)
  expect(c.n2.grammar).toBeNull()
})
it('valid counts do not request banks', async () => {
  const counts = Object.fromEntries(
    ['n5', 'n4', 'n3', 'n2', 'n1'].map((lv) => [
      lv,
      { vocab: 2, grammar: 3, reading: 0, listening: 1 },
    ]),
  )
  const fetcher = vi.fn().mockResolvedValue(response(counts))
  expect(await createQuestionBank(fetcher).counts()).toEqual(counts)
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('distinguishes failed resource, missing stable ID and reading subquestion after reordering', async () => {
  const article = {
    id: 'article',
    level: 'n3',
    title: '題',
    type: '文',
    text: '本文',
    notes: [],
    questions: [
      { id: 'rq-2', q: '問', answer: '正', distractors: ['一', '二', '三'], explanation: '解' },
      { id: 'rq-1', q: '原題', answer: '正', distractors: ['一', '二', '三'], explanation: '解' },
    ],
  }
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(Error())
    .mockResolvedValue(response([article]))
  const bank = createQuestionBank(fetcher)
  const ref = { level: 'n3' as const, kind: 'reading' as const, id: 'rq-1', articleId: 'article' }
  expect((await bank.resolve(ref)).status).toBe('error')
  expect(await bank.resolve(ref)).toMatchObject({
    status: 'ready',
    item: { id: 'rq-1', q: '原題' },
    article: { id: 'article' },
  })
  expect((await bank.resolve({ ...ref, id: 'gone' })).status).toBe('unavailable')
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it.each(['duplicate', 'empty', 'blank', 'invalid-level'])(
  'rejects invalid reading structure: %s',
  async (mode) => {
    const q = {
      id: 'rq-1',
      q: '問',
      answer: '正',
      distractors: ['一', '二', '三'],
      explanation: '解',
    }
    const a = {
      id: 'article',
      level: mode === 'invalid-level' ? 'n6' : 'n3',
      title: mode === 'blank' ? ' ' : '題',
      type: '文',
      text: '本文',
      notes: [],
      questions: mode === 'empty' ? [] : mode === 'duplicate' ? [q, q] : [q],
    }
    expect(
      (await createQuestionBank(vi.fn().mockResolvedValue(response([a]))).load('reading', 'n3'))
        .failed,
    ).toBe(true)
  },
)
it('rejects grammar IDs from another level instead of caching them', async () => {
  const item = {
    id: 'g-n2-031',
    q: '問',
    answer: '正',
    distractors: ['一', '二', '三'],
    explanation: '解',
  }
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response([item]))
    .mockResolvedValue(response([{ ...item, id: 'g-n3-031' }]))
  const bank = createQuestionBank(fetcher)
  expect((await bank.load('grammar', 'n3')).failed).toBe(true)
  expect((await bank.load('grammar', 'n3')).failed).toBe(false)
  expect(fetcher).toHaveBeenCalledTimes(2)
})
