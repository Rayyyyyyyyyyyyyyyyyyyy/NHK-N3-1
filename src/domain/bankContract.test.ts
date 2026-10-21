import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
// @ts-expect-error Native ESM build-time contract utility.
import { checkData } from '../../tools/data-contract.mjs'
import { createQuestionBank } from '../services/questionBank'
import { mapLevels, LEVELS } from './progress/state'
import type { BankKind } from './questions'

const question = { q: '問題', answer: '正', distractors: ['一', '二', '三'], explanation: '解説' }
const vocab = { w: '九', r: 'きゅう', zh: '九', en: 'nine' }
const grammar = { ...question, id: 'g-n3-001' }
const reading = {
  id: 'article',
  level: 'n3',
  title: '題',
  type: '文',
  text: '本文',
  notes: [],
  questions: [{ ...question, id: 'rq-1' }],
}
const listening = { ...question, id: 'listen', level: 'n3', script: '逐字稿' }
const valid = { vocab: [vocab], grammar: [grammar], reading: [reading], listening: [listening] }
const response = (items: unknown) => ({ ok: true, json: async () => items }) as Response
function cliInput(kind: BankKind, items: unknown[]) {
  const banks = {
    vocab: mapLevels(() => [] as unknown[]),
    grammar: mapLevels(() => [] as unknown[]),
    reading: [] as unknown[],
    listening: [] as unknown[],
  }
  if (kind === 'vocab' || kind === 'grammar') banks[kind].n3 = items
  else banks[kind] = items
  return banks
}

it.each<BankKind>(['vocab', 'grammar', 'reading', 'listening'])(
  'accepts the same valid %s content through CLI and runtime',
  async (kind) => {
    expect(() => checkData(cliInput(kind, valid[kind]))).not.toThrow()
    const bank = createQuestionBank(vi.fn().mockResolvedValue(response(valid[kind])))
    expect(await bank.load(kind, 'n3')).toEqual({ items: valid[kind], failed: false })
  },
)

const invalid: [BankKind, string, unknown[]][] = [
  ['vocab', 'null item', [null]],
  ['vocab', 'no translation', [{ ...vocab, zh: '', en: ' ' }]],
  ['vocab', 'blank reading', [{ ...vocab, r: ' ' }]],
  ['grammar', 'wrong level ID', [{ ...grammar, id: 'g-n2-001' }]],
  ['grammar', 'duplicate ID', [grammar, grammar]],
  ['grammar', 'answer among distractors', [{ ...grammar, distractors: ['正', '二', '三'] }]],
  ['grammar', 'too few options', [{ ...grammar, distractors: ['一', '二'] }]],
  ['reading', 'empty article', [{ ...reading, questions: [] }]],
  ['reading', 'invalid level', [{ ...reading, level: 'n6' }]],
  ['reading', 'invalid note', [{ ...reading, notes: [null] }]],
  ['reading', 'subquestion ID reused across articles', [reading, { ...reading, id: 'other' }]],
  ['listening', 'blank script', [{ ...listening, script: ' ' }]],
]
it.each(invalid)(
  'rejects %s %s in both adapters and allows runtime retry',
  async (kind, _name, items) => {
    expect(() => checkData(cliInput(kind, items))).toThrow()
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(items))
      .mockResolvedValue(response(valid[kind]))
    const bank = createQuestionBank(fetcher)
    expect((await bank.load(kind, 'n3')).failed).toBe(true)
    expect((await bank.load(kind, 'n3')).failed).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(2)
  },
)

it('preserves alternate readings while counting one learning item in CLI and fallback counts', async () => {
  const items = [vocab, { ...vocab, r: 'く' }]
  expect(checkData(cliInput('vocab', items)).n3.vocab).toBe(1)
  const fetcher = vi.fn(async (url: string) => {
    if (url.endsWith('counts.json')) throw Error('unavailable')
    return response(url.includes('vocab-') ? items : [])
  })
  const bank = createQuestionBank(fetcher as typeof fetch)
  expect((await bank.counts()).n3.vocab).toBe(1)
  expect((await bank.load('vocab', 'n3')).items).toEqual(items)
})

it('uses distinct words for all generated vocabulary denominators', () => {
  const read = (name: string) => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8'))
  const banks = {
    vocab: mapLevels((lv) => read(`vocab-${lv}`)),
    grammar: mapLevels((lv) => read(`grammar-${lv}`)),
    reading: read('reading'),
    listening: read('listening'),
  }
  const counts = checkData(banks)
  for (const lv of LEVELS)
    expect(counts[lv].vocab).toBe(new Set(banks.vocab[lv].map((v: { w: string }) => v.w)).size)
})
