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
