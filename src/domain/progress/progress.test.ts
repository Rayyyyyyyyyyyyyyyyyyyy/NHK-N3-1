import { describe, it, expect } from 'vitest'
import { defaultState, normalize, encodeCode, decodeCode, touchStreak } from './state'
import { createProgressStorage, STORAGE_KEY } from '../../services/progressStorage'
import { createProgressSession } from './session'
const memory = () => {
  const values = new Map<string, string>()
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v)
    },
    removeItem: (k: string) => {
      values.delete(k)
    },
  }
}
const codeFor = (v: unknown) => btoa(encodeURIComponent(JSON.stringify(v)))
describe('archive non-migration regression cases, adapted to v4 and reversible undo', () => {
  it('rejects unrelated JSON and malformed input without touching progress or backups', () => {
    const s = createProgressSession(createProgressStorage(memory()))
    s.state.vKnown.n3['作法'] = true
    s.state.gDone.n3 = ['g-n3-005']
    const before = JSON.stringify(s.state)
    for (const code of [
      codeFor({ hello: 'world' }),
      '這不是 base64!!!',
      codeFor({ version: 4, state: { hello: 'world' } }),
    ])
      expect(() => s.importCode(code)).toThrow()
    expect(JSON.stringify(s.state)).toBe(before)
    expect(s.backups).toEqual([])
  })
  it('imports and restores, retaining the ability to undo restoration', () => {
    const storage = createProgressStorage(memory())
    const s = createProgressSession(storage)
    s.state.vKnown.n3['作法'] = true
    const incoming = defaultState()
    incoming.vKnown.n3['様々'] = true
    s.importCode(encodeCode(incoming))
    expect(s.state).toEqual(incoming)
    expect(s.backups).toHaveLength(1)
    s.restore()
    expect(s.state.vKnown.n3['作法']).toBe(true)
    s.restore()
    expect(s.state).toEqual(incoming)
  })
  it('restored data survives reload', () => {
    const storage = createProgressStorage(memory())
    const s = createProgressSession(storage)
    s.state.vKnown.n1['曖昧'] = true
    s.importCode(encodeCode(defaultState()))
    s.restore()
    expect(createProgressSession(storage).state.vKnown.n1['曖昧']).toBe(true)
  })
  it('storage read/write/remove exceptions are safe and expose no backup', () => {
    const denied = () => {
      throw Error('denied')
    }
    const storage = createProgressStorage({ getItem: denied, setItem: denied, removeItem: denied })
    const s = createProgressSession(storage)
    expect(s.state).toEqual(defaultState())
    expect(s.backups).toEqual([])
    expect(() => s.importCode(encodeCode(defaultState()))).toThrow()
    expect(storage.remove()).toBe(false)
    expect(s.restore()).toBe(false)
  })
})
it('round trips every field at every level, Unicode and streak', () => {
  const s = defaultState()
  s.level = 'n2'
  s.streak = 7
  s.lastDate = '2026-09-08'
  for (const lv of ['n5', 'n4', 'n3', 'n2', 'n1'] as const) {
    s.vKnown[lv]['水'] = true
    s.vLearning[lv]['曖昧'] = true
    s.gDone[lv] = [`g-${lv}-001`]
    s.rDone[lv] = ['r1']
    s.lDone[lv] = ['l1', 'l2']
    s.lCorrect[lv] = ['l1']
  }
  expect(decodeCode(encodeCode(s))).toEqual(s)
})
it('ignores old storage keys and rejects old codes entirely', () => {
  const m = memory()
  m.setItem('nihongo_dojo_v3', JSON.stringify({ vKnown: { n3: { 水: true } } }))
  expect(createProgressSession(createProgressStorage(m)).state).toEqual(defaultState())
  expect(() => decodeCode(codeFor({ vKnown: { n3: { 水: true } } }))).toThrow(/不支援/)
  expect(STORAGE_KEY).not.toBe('nihongo_dojo_v3')
})
it('normalizes partial same-version data without aliasing', () => {
  const p = { vKnown: { n3: { 水: true } }, gDone: { n3: ['g-n3-001'] }, level: 'invalid' }
  const s = normalize(p)
  expect(s.level).toBe('n5')
  expect(s.gDone.n1).toEqual([])
  s.gDone.n3.push('g-n3-002')
  expect(p.gDone.n3).toHaveLength(1)
})
it('retains A after A→B→C and lets undo itself be undone after new learning', () => {
  const s = createProgressSession(createProgressStorage(memory()))
  s.state.vKnown.n5.A = true
  const b = defaultState()
  b.vKnown.n5.B = true
  const c = defaultState()
  c.vKnown.n5.C = true
  s.importCode(encodeCode(b))
  s.importCode(encodeCode(c))
  s.state.vKnown.n5.D = true
  s.restore()
  expect(s.state).toEqual(b)
  s.restore()
  expect(s.state.vKnown.n5.D).toBe(true)
  const a = s.backups.findIndex((x) => x.state.vKnown.n5.A)
  expect(a).toBeGreaterThanOrEqual(0)
  s.restore(a)
  expect(s.state.vKnown.n5.A).toBe(true)
})
it('bounds snapshots', () => {
  const s = createProgressSession(createProgressStorage(memory()))
  for (let i = 0; i < 20; i++) s.importCode(encodeCode(defaultState()))
  expect(s.backups).toHaveLength(10)
})
it('updates streak on same, next and interrupted dates', () => {
  const s = defaultState()
  s.streak = 5
  s.lastDate = '2026-09-07'
  touchStreak(s, '2026-09-07')
  expect(s.streak).toBe(5)
  touchStreak(s, '2026-09-08')
  expect(s.streak).toBe(6)
  touchStreak(s, '2026-09-11')
  expect(s.streak).toBe(1)
})
