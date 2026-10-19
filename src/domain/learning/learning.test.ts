import { describe, it, expect } from 'vitest'
import { defaultState, encodeCode, decodeCode, LEVELS } from '../progress/state'
import { validateV4, validateV5 } from '../progress/validation'
import { upgradeV4 } from '../progress/upgrade'
import { recordResult, completeArticle } from './reducer'
import { itemKey, dayKey, type LearningInput } from './types'
import { localDate, addDays } from './calendar'
import { generateGroup, groupProgress, refsFor, vocabQueue, unfinished } from './plans'
import {
  createProgressStorage,
  STORAGE_KEY,
  LEGACY_KEY,
  BACKUP_KEY,
} from '../../services/progressStorage'
import { createProgressSession } from '../progress/session'
const clock =
  (day = '2026-10-16') =>
  () =>
    new Date(`${day}T12:00:00`)
const input = (id = '水', correct = false, attemptId = 'a'): LearningInput => ({
  attemptId,
  ref: { level: 'n3', kind: 'vocab', id },
  mode: 'flashcard',
  correct,
})
const legacy = () => {
  const { results, days, plans, mistakes, schedules, ...s } = defaultState()
  return s
}
const code = (state: unknown, version = 4) =>
  btoa(encodeURIComponent(JSON.stringify({ version, state })))
const memory = () => {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v)
    },
    removeItem: (k: string) => {
      values.delete(k)
    },
  }
}
describe('strict imported trust boundary', () => {
  it('rejects malformed and conflicting v4 without changing state, backups or disk', () => {
    const port = memory(),
      session = createProgressSession(createProgressStorage(port, clock()), clock())
    session.commit(recordResult(session.state, input(), clock()))
    const before = JSON.stringify(session),
      disk = JSON.stringify([...port.values])
    const invalid: unknown[] = [
      { vKnown: [] },
      { ...legacy(), extra: 1 },
      { ...legacy(), streak: NaN },
      { ...legacy(), streak: -1 },
      { ...legacy(), streak: 1.5 },
      { ...legacy(), lastDate: '2026-02-30' },
      { ...legacy(), level: 'n6' },
    ]
    const missing = legacy()
    delete (missing.vKnown as Partial<typeof missing.vKnown>).n1
    invalid.push(missing)
    const badFlag = legacy()
    ;(badFlag.vKnown.n1 as Record<string, unknown>).水 = 'true'
    invalid.push(badFlag)
    const duplicates = legacy()
    duplicates.gDone.n3 = ['same', 'same']
    invalid.push(duplicates)
    const overlap = legacy()
    overlap.vKnown.n5.水 = true
    overlap.vLearning.n5.水 = true
    invalid.push(overlap)
    const subset = legacy()
    subset.lCorrect.n1 = ['unknown']
    invalid.push(subset)
    for (const value of invalid) {
      expect(validateV4(value)).toBe(false)
      expect(() => session.importCode(code(value))).toThrow()
    }
    for (const version of [2, 3, 6])
      expect(() => session.importCode(code(legacy(), version))).toThrow()
    expect(JSON.stringify(session)).toBe(before)
    expect(JSON.stringify([...port.values])).toBe(disk)
  })
  it('accepts complete blanks and unknown IDs, preserving all five levels and baseline', () => {
    const old = legacy()
    old.level = 'n1'
    old.streak = 9
    old.lastDate = '2026-10-16'
    for (const lv of LEVELS) {
      old.vKnown[lv]['水|[]'] = true
      old.vLearning[lv]['曖昧'] = true
      old.gDone[lv] = ['not-in-bank']
      old.rDone[lv] = ['gone']
      old.lDone[lv] = ['gone']
      old.lCorrect[lv] = ['gone']
    }
    const next = upgradeV4(old, '2026-10-16')
    expect(decodeCode(code(old), '2026-10-16')).toEqual(next)
    expect(next.results).toEqual([])
    expect(Object.values(next.schedules)).toHaveLength(10)
    expect(
      Object.values(next.schedules).every(
        (x) => x.stage === 0 && x.dueOn === '2026-10-16' && x.lastScheduledOn === '',
      ),
    ).toBe(true)
    expect(decodeCode(encodeCode(next))).toEqual(next)
    expect(validateV5(defaultState())).toBe(true)
  })
  it('rejects new field corruption, duplicates, invalid modes/dates/capacity and unknown nested fields', () => {
    const state = recordResult(defaultState(), input(), clock())
    const changed = (f: (s: typeof state) => void) => {
      const copy = JSON.parse(JSON.stringify(state))
      f(copy)
      expect(() => decodeCode(code(copy, 5))).toThrow()
    }
    changed((s) => {
      s.results.push(s.results[0])
    })
    changed((s) => {
      s.results[0].mode = 'grammar'
    })
    changed((s) => {
      s.results[0].date = '2026-02-30'
    })
    changed((s) => {
      s.schedules[itemKey(input().ref)].stage = 6
    })
    changed((s) => {
      s.days[dayKey('2026-10-16', 'n3')].correctItems = ['absent']
    })
    changed((s) => {
      ;(s.mistakes[itemKey(input().ref)] as unknown as Record<string, unknown>).extra = true
    })
    changed((s) => {
      s.results = Array.from({ length: 2001 }, (_, i) => ({
        ...s.results[0],
        attemptId: String(i),
      }))
    })
  })
})
describe('learning projection', () => {
  it('keys distinguish levels and special characters; duplicate attempts are no-ops', () => {
    expect(itemKey(input('a,b').ref)).not.toBe(itemKey({ ...input('a,b').ref, level: 'n1' }))
    expect(itemKey(input('a,b').ref)).not.toBe(itemKey(input('a","b').ref))
    const s = recordResult(defaultState(), input(), clock())
    expect(recordResult(s, input(), clock())).toBe(s)
    expect(s.vLearning.n3.水).toBe(true)
    expect(s.streak).toBe(1)
    expect(s.results).toHaveLength(1)
    expect(recordResult(s, { ...input(), mode: 'grammar', attemptId: 'bad' }, clock())).toBe(s)
  })
  it('wrong → correct → wrong and shared vocabulary modes preserve counts, latest result and mastery semantics', () => {
    let s = recordResult(defaultState(), input(), clock())
    s = recordResult(s, { ...input('水', true, 'b'), mode: 'pronunciation' }, clock())
    const key = itemKey(input().ref)
    expect(s.mistakes[key].pending).toBe(false)
    expect(s.vKnown.n3.水).toBeUndefined()
    s = recordResult(s, { ...input('水', false, 'c'), mode: 'pronunciation' }, clock())
    expect(s.mistakes[key].wrongCount).toBe(2)
    expect(s.mistakes[key].lastWrongMode).toBe('pronunciation')
    s = recordResult(s, input('水', true, 'd'), clock())
    expect(s.vKnown.n3.水).toBe(true)
    expect(s.vLearning.n3.水).toBeUndefined()
    const day = s.days[dayKey('2026-10-16', 'n3')]
    expect(day.items).toHaveLength(1)
    expect(day.correctItems).toHaveLength(1)
  })
  it('keeps long-lived projections when 2,000 event window truncates and 90 days prune', () => {
    let s = recordResult(defaultState(), input('first', false, 'first'), clock())
    s.results = Array.from({ length: 1999 }, (_, i) => ({
      ...s.results[0],
      attemptId: `other-${i}`,
    })).concat(s.results)
    s = recordResult(s, input('last', true, 'last'), clock())
    expect(s.results).toHaveLength(2000)
    expect(s.vLearning.n3.first).toBe(true)
    expect(s.mistakes[itemKey(input('first').ref)]).toBeTruthy()
    expect(s.days[dayKey('2026-10-16', 'n3')].items).toHaveLength(2)
    s = recordResult(s, input('next', true, 'next'), clock('2027-02-01'))
    expect(s.days[dayKey('2026-10-16', 'n3')]).toBeUndefined()
    expect(s.schedules[itemKey(input('first').ref)]).toBeTruthy()
  })
  it('streak handles first, same, next, interrupted, clock rollback and v4 same-day baseline', () => {
    let s = defaultState()
    for (const [i, day, expected] of [
      [0, '2026-10-16', 1],
      [1, '2026-10-16', 1],
      [2, '2026-10-17', 2],
      [3, '2026-10-15', 2],
      [4, '2026-10-17', 2],
      [5, '2026-10-20', 1],
    ] as const) {
      s = recordResult(s, input('水', false, String(i)), clock(day))
      expect(s.streak).toBe(expected)
    }
    const old = legacy()
    old.streak = 5
    old.lastDate = '2026-10-16'
    s = recordResult(upgradeV4(old, '2026-10-16'), input(), clock())
    expect(s.streak).toBe(5)
  })
  it('uses stable reading subquestion IDs and requires complete matching article attempt', () => {
    let s = defaultState()
    const articleAttempt = 'article-A',
      ids = ['rq-second', 'rq-first']
    const resultIds = ids.map((id) => JSON.stringify([articleAttempt, id]))
    ids.forEach((id, i) => {
      s = recordResult(
        s,
        {
          attemptId: resultIds[i],
          ref: { level: 'n3', kind: 'reading', id, articleId: 'r1' },
          mode: 'reading',
          correct: i === 0,
        },
        clock(),
      )
    })
    expect(
      completeArticle(
        s,
        {
          attemptId: articleAttempt,
          level: 'n3',
          articleId: 'r1',
          questionIds: ids,
          resultIds: ['missing'],
        },
        clock(),
      ),
    ).toBe(s)
    s = completeArticle(
      s,
      { attemptId: articleAttempt, level: 'n3', articleId: 'r1', questionIds: ids, resultIds },
      clock(),
    )
    expect(s.rDone.n3).toEqual([])
    expect(s.days[dayKey('2026-10-16', 'n3')].articles).toEqual(['r1'])
    expect(
      completeArticle(
        s,
        { attemptId: articleAttempt, level: 'n3', articleId: 'r1', questionIds: ids, resultIds },
        clock(),
      ),
    ).toBe(s)
  })
})
describe('spaced local-calendar vocabulary', () => {
  it('progresses 1/3/7/14/30 then repeats 30, preventing early and same-day advancement', () => {
    let s = defaultState(),
      day = '2026-10-16'
    const key = itemKey(input().ref)
    for (let i = 0; i < 6; i++) {
      s = recordResult(s, input('水', true, `a${i}`), clock(day))
      const schedule = s.schedules[key]
      expect(schedule.stage).toBe(Math.min(i + 1, 5))
      expect(schedule.dueOn).toBe(addDays(day, [1, 3, 7, 14, 30, 30][i]))
      const due = schedule.dueOn
      s = recordResult(s, input('水', true, `same${i}`), clock(day))
      expect(s.schedules[key].dueOn).toBe(due)
      if (i > 0) {
        s = recordResult(s, input('水', true, `early${i}`), clock(addDays(day, 1)))
        expect(s.schedules[key].dueOn).toBe(due)
      }
      day = due
    }
    s = recordResult(s, input('水', false, 'fail'), clock(day))
    s = recordResult(s, input('水', true, 'retry'), clock(day))
    expect(s.schedules[key].stage).toBe(0)
    expect(s.schedules[key].dueOn).toBe(day)
    expect(s.mistakes[key].pending).toBe(false)
  })
  it('uses calendar days over DST and prioritizes a unique max-10 due-only queue', () => {
    const previous = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
      expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
      expect(localDate(new Date('2026-03-09T00:30:00'))).toBe('2026-03-09')
    } finally {
      process.env.TZ = previous
    }
    const items = Array.from({ length: 16 }, (_, i) => ({
      w: String(i),
      r: `音${i}`,
      zh: '字',
      en: 'word',
    }))
    let s = defaultState()
    for (const item of items.slice(0, 15))
      s = recordResult(s, input(item.w, false, item.w), clock())
    const queue = vocabQueue([...items, items[0]], s, 'n3', '2026-10-16', true)
    expect(queue).toHaveLength(10)
    expect(new Set(queue.map((v) => v.w)).size).toBe(10)
    expect(queue.every((v) => v.w !== '15')).toBe(true)
    expect(vocabQueue(items, defaultState(), 'n3', '2026-10-16', true)).toEqual([])
  })
})
describe('fixed tasks and persistence', () => {
  it('counts prior-day matching activity once, fixes unique targets and never completes zero', () => {
    let s = recordResult(defaultState(), input('水', false, 'a'), clock())
    const group = generateGroup(
      s,
      refsFor('vocab', 'n3', [{ w: '水', r: 'みず', zh: '水', en: 'water' }]),
      'vocab',
      '2026-10-16',
    )
    const plan = {
      date: '2026-10-16',
      level: 'n3' as const,
      branch: 'reading' as const,
      started: false,
      groups: { vocab: group },
    }
    s.plans[dayKey(plan.date, plan.level)] = plan
    expect(groupProgress(s, plan, 'vocab')).toEqual({
      done: 1,
      total: 1,
      correct: 0,
      complete: true,
    })
    expect(unfinished(s, plan, 'vocab')).toEqual([])
    expect(groupProgress(s, plan, 'grammar').complete).toBe(false)
    s = recordResult(s, input('水', true, 'redo'), clock())
    expect(groupProgress(s, plan, 'vocab').done).toBe(1)
    expect(groupProgress(s, plan, 'vocab').correct).toBe(1)
    expect(decodeCode(encodeCode(s))).toEqual(s)
  })
  it('upgrades v4 and valid snapshots once without altering old keys; existing v5 wins', () => {
    const p = memory(),
      old = legacy()
    old.vKnown.n3.水 = true
    p.setItem(LEGACY_KEY, JSON.stringify(old))
    p.setItem(
      BACKUP_KEY,
      JSON.stringify([
        { state: old, at: new Date().toISOString(), reason: '匯入前' },
        { state: { bad: true } },
      ]),
    )
    const original = [p.getItem(LEGACY_KEY), p.getItem(BACKUP_KEY)]
    const s = createProgressSession(createProgressStorage(p, clock()), clock())
    expect(s.state.vKnown.n3.水).toBe(true)
    expect(s.backups).toHaveLength(1)
    s.commit(recordResult(s.state, input('new', false), clock()))
    expect(createProgressSession(createProgressStorage(p, clock())).state.results).toHaveLength(1)
    expect([p.getItem(LEGACY_KEY), p.getItem(BACKUP_KEY)]).toEqual(original)
  })
  it('retries failed upgrade and preserves corrupt sources during ordinary practice', () => {
    const p = memory()
    p.setItem(LEGACY_KEY, JSON.stringify(legacy()))
    let fail = true
    const port = {
      ...p,
      setItem: (k: string, v: string) => {
        if (fail) throw Error('quota')
        p.setItem(k, v)
      },
    }
    const storage = createProgressStorage(port, clock()),
      s = createProgressSession(storage, clock())
    expect(storage.available).toBe(false)
    expect(p.getItem(STORAGE_KEY)).toBeNull()
    fail = false
    expect(createProgressSession(createProgressStorage(port, clock())).state).toEqual(s.state)
    p.setItem(STORAGE_KEY, 'broken')
    const damaged = createProgressStorage(p, clock()),
      memorySession = createProgressSession(damaged, clock())
    memorySession.commit(recordResult(memorySession.state, input(), clock()))
    expect(p.getItem(STORAGE_KEY)).toBe('broken')
    expect(damaged.rawSource).toBe('broken')
    expect(decodeCode(encodeCode(memorySession.state)).results).toHaveLength(1)
    expect(damaged.error).toContain('損毀')
  })
  it('overwrites atomically or keeps all state and snapshots; ordinary quota failure remains exportable', () => {
    const p = memory()
    let fail = false,
      writes = 0
    const port = {
      ...p,
      setItem: (k: string, v: string) => {
        writes++
        if (fail) throw Error('quota')
        p.setItem(k, v)
      },
    }
    const storage = createProgressStorage(port, clock()),
      s = createProgressSession(storage, clock())
    s.commit(recordResult(s.state, input(), clock()))
    const old = JSON.stringify(s),
      disk = p.getItem(STORAGE_KEY)
    fail = true
    expect(() => s.importCode(encodeCode(defaultState()))).toThrow()
    expect(JSON.stringify(s)).toBe(old)
    expect(p.getItem(STORAGE_KEY)).toBe(disk)
    s.commit(recordResult(s.state, input('latest', true, 'latest'), clock()))
    expect(decodeCode(encodeCode(s.state)).vKnown.n3.latest).toBe(true)
    expect(
      createProgressSession(createProgressStorage(p, clock())).state.vKnown.n3.latest,
    ).toBeUndefined()
    fail = false
    const before = writes
    s.importCode(encodeCode(defaultState()))
    expect(writes - before).toBe(1)
    expect(s.backups[0].state.vKnown.n3.latest).toBe(true)
    s.restore()
    expect(s.state.vKnown.n3.latest).toBe(true)
    s.restore()
    expect(s.state).toEqual(defaultState())
    expect(JSON.parse(decodeURIComponent(atob(encodeCode(s.state)))).backups).toBeUndefined()
  })
})
