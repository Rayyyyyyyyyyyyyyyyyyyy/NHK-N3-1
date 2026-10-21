import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import VocabPage from './VocabPage.vue'
import GrammarPage from './GrammarPage.vue'
import ReadingPage from './ReadingPage.vue'
import ListeningPage from './ListeningPage.vue'
import ReviewPage from './ReviewPage.vue'
import HomePage from './HomePage.vue'
import { useProgressStore } from '../stores/progress'
import { questionBank, createQuestionBank } from '../services/questionBank'
import { dayKey, itemKey, type StudyKind, type LearningInput } from '../domain/learning/types'
import { localDate } from '../domain/learning/calendar'
import { inspectGroup } from '../domain/learning/plans'
import { encodeCode, defaultState, mapLevels } from '../domain/progress/state'
import { STORAGE_KEY } from '../services/progressStorage'
const vocab = Array.from({ length: 12 }, (_, i) => ({
  w: `字${String(i).padStart(2, '0')}`,
  r: `おと${i}`,
  zh: `字義${i}`,
  en: `word${i}`,
}))
const grammar = Array.from({ length: 8 }, (_, i) => ({
  id: `g-${i}`,
  q: `文法${i}`,
  answer: `正${i}`,
  distractors: [`誤${i}a`, `誤${i}b`, `誤${i}c`],
  explanation: `解説${i}`,
}))
const reading = [
  {
    id: 'r-test',
    level: 'n3' as const,
    title: '通知',
    type: '短文',
    text: '文章上下文',
    notes: [{ term: '備註', meaning: '意思' }],
    questions: grammar.slice(0, 2).map((q, i) => ({ ...q, id: `rq-${i}` })),
  },
]
const listening = [{ ...grammar[0], id: 'l-test', level: 'n3' as const, script: '逐字稿內容' }]
const banks = { vocab, grammar, reading, listening }
const submitted = (
  kind: StudyKind,
  id: string,
  correct = false,
  mode: LearningInput['mode'] = kind === 'vocab' ? 'flashcard' : kind,
): LearningInput => ({
  attemptId: `${kind}-${id}-${Math.random()}`,
  ref: { level: 'n3', kind, id, ...(kind === 'reading' ? { articleId: 'r-test' } : {}) },
  mode,
  correct,
})
let wrappers: VueWrapper[] = []
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-16T12:00:00'))
  useProgressStore().setLevel('n3')
  vi.spyOn(questionBank, 'load').mockImplementation(
    async (kind) => ({ items: banks[kind], failed: false }) as never,
  )
  vi.spyOn(questionBank, 'counts').mockResolvedValue(
    mapLevels(() => ({ vocab: 12, grammar: 8, reading: 1, listening: 1 })),
  )
  vi.spyOn(questionBank, 'resolve').mockImplementation(async (r) => {
    if (r.kind === 'reading') {
      const article = reading.find((a) => a.id === r.articleId)
      const item = article?.questions.find((q) => q.id === r.id)
      return item ? { status: 'ready', item, article } : { status: 'unavailable' }
    }
    const item =
      r.kind === 'vocab'
        ? vocab.find((v) => v.w === r.id)
        : (banks[r.kind] as typeof grammar).find((q) => q.id === r.id)
    return item ? { status: 'ready', item } : { status: 'unavailable' }
  })
  vi.stubGlobal('speechSynthesis', undefined)
})
afterEach(() => {
  for (const w of wrappers) w.unmount()
  wrappers = []
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
async function page(component: typeof VocabPage, path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component }],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}
async function button(w: VueWrapper, text: string) {
  await w
    .findAll('button')
    .find((b) => b.text() === text || (b.classes('option-btn') && b.text().endsWith(text)))!
    .trigger('click')
  await flushPromises()
}
it('initial home requests counts only; tasks remain fixed through retries, reload and level switches', async () => {
  const { wrapper } = await page(HomePage, '/')
  expect(questionBank.load).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('建立今日任務')
  const store = useProgressStore()
  await store.buildPlan('listening')
  expect(vi.mocked(questionBank.load).mock.calls.every((c) => c[1] === 'n3')).toBe(true)
  const key = dayKey(localDate(), 'n3'),
    targets = JSON.stringify(store.session.state.plans[key].groups)
  await store.buildPlan('listening')
  expect(JSON.stringify(store.session.state.plans[key].groups)).toBe(targets)
  store.setLevel('n2')
  await store.buildPlan('reading')
  store.setLevel('n3')
  expect(JSON.stringify(store.session.state.plans[key].groups)).toBe(targets)
  setActivePinia(createPinia())
  expect(JSON.stringify(useProgressStore().session.state.plans[key].groups)).toBe(targets)
})
it('shows full word mastery on vocab and home while preserving alternate-reading rows', async () => {
  const items = [vocab[0], { ...vocab[0], r: 'べつのよみ' }, vocab[1]]
  const bank = createQuestionBank(
    vi.fn(async (url: string) => {
      if (url.endsWith('counts.json')) throw Error('counts unavailable')
      return { ok: true, json: async () => (url.includes('vocab-') ? items : []) } as Response
    }) as typeof fetch,
  )
  vi.mocked(questionBank.load).mockImplementation(bank.load)
  vi.mocked(questionBank.counts).mockImplementation(bank.counts)
  const store = useProgressStore()
  for (const item of items) store.markVocab('n3', item.w, true)
  const before = store.exportCode()
  const vocabPage = await page(VocabPage, '/vocab')
  expect(vocabPage.wrapper.find('.meta-row').text()).toMatch(/已掌握\s*2\s*／\s*2/)
  const home = await page(HomePage, '/')
  const progress = home.wrapper.find('.current-progress-card .progress-row')
  expect(progress.text()).toMatch(/2\s*\/\s*2/)
  expect(progress.find('.progress-fill').attributes('style')).toContain('width: 100%')
  expect((await bank.load('vocab', 'n3')).items).toEqual(items)
  expect(store.exportCode()).toBe(before)
})
it('writes delayed plans to the captured level/date and retries only failed groups', async () => {
  const store = useProgressStore()
  let resolve!: (v: unknown) => void
  let grammarCalls = 0
  vi.mocked(questionBank.load).mockImplementation(async (kind, level) => {
    if (kind === 'vocab')
      return (await new Promise<unknown>((r) => {
        resolve = r
      })) as never
    if (kind === 'grammar' && grammarCalls++ === 0) return { items: [], failed: true }
    return { items: banks[kind], failed: false } as never
  })
  const request = store.buildPlan('reading')
  await flushPromises()
  store.setLevel('n2')
  resolve({ items: vocab, failed: false })
  await request
  const original = store.session.state.plans[dayKey(localDate(), 'n3')]
  expect(original.groups.vocab?.targets).toHaveLength(10)
  expect(store.session.state.plans[dayKey(localDate(), 'n2')]).toBeUndefined()
  const target = JSON.stringify(original.groups.vocab)
  await store.buildPlan('reading', localDate(), 'n3')
  expect(JSON.stringify(store.session.state.plans[dayKey(localDate(), 'n3')].groups.vocab)).toBe(
    target,
  )
  expect(store.session.state.plans[dayKey(localDate(), 'n3')].groups.grammar?.targets).toHaveLength(
    5,
  )
})
it('does not allow an old pending plan to mutate an imported replacement', async () => {
  const store = useProgressStore()
  let resolve!: (v: unknown) => void
  vi.mocked(questionBank.load).mockImplementation(
    async () =>
      (await new Promise<unknown>((r) => {
        resolve = r
      })) as never,
  )
  // Each resource has an independent deferred promise.
  const resolvers: ((v: unknown) => void)[] = []
  vi.mocked(questionBank.load).mockImplementation(
    async () => (await new Promise<unknown>((r) => resolvers.push(r))) as never,
  )
  const request = store.buildPlan('reading')
  await flushPromises()
  store.importCode(encodeCode(defaultState()))
  for (const r of resolvers) r({ items: [], failed: false })
  await request
  expect(store.session.state.plans).toEqual({})
})
it('grammar daily resumes saved unfinished targets; a wrong answer counts once and persists analysis', async () => {
  const store = useProgressStore()
  await store.buildPlan('reading')
  const plan = store.session.state.plans[dayKey(localDate(), 'n3')]
  const first = plan.groups.grammar!.targets[0].id
  store.recordLearning(submitted('grammar', first, true))
  const { wrapper } = await page(
    GrammarPage,
    `/grammar?study=daily&date=${localDate()}&group=grammar`,
  )
  const second = grammar.find((g) => g.id === plan.groups.grammar!.targets[1].id)!
  expect(wrapper.text()).toContain(second.q)
  await button(wrapper, second.distractors[0])
  expect(inspectGroup(store.session.state, plan, 'grammar', grammar).done).toBe(2)
  expect(wrapper.text()).toContain(second.explanation)
  expect(store.session.state.mistakes[itemKey(submitted('grammar', second.id).ref)].pending).toBe(
    true,
  )
  await button(wrapper, '下一題')
  expect(wrapper.text()).not.toContain(second.q)
})
it('reading daily completion differs from mastery, while review retains article context and cannot complete an article', async () => {
  const store = useProgressStore()
  await store.buildPlan('reading')
  const { wrapper } = await page(
    ReadingPage,
    `/reading?study=daily&date=${localDate()}&group=reading`,
  )
  await wrapper.find('.reading-list-item').trigger('click')
  await button(wrapper, grammar[0].distractors[0])
  await button(wrapper, grammar[1].answer)
  const plan = store.session.state.plans[dayKey(localDate(), 'n3')]
  expect(inspectGroup(store.session.state, plan, 'reading', reading).done).toBe(1)
  expect(store.session.state.rDone.n3).toEqual([])
  const review = await page(ReviewPage, '/review')
  expect(review.wrapper.text()).toContain('文章上下文')
  expect(review.wrapper.text()).toContain('備註＝意思')
  await button(review.wrapper, grammar[0].answer)
  expect(review.wrapper.text()).toContain(grammar[0].explanation)
  expect(store.session.state.rDone.n3).toEqual([])
  expect(review.wrapper.text()).toContain('目前待複習 0 題')
})
it('flashcard and pronunciation share results but manual mastery adds no activity; due-only empty never draws fresh cards', async () => {
  const store = useProgressStore()
  const { wrapper, router } = await page(VocabPage, '/vocab')
  expect(store.session.state.results).toHaveLength(0)
  await wrapper.find('.flashcard').trigger('click')
  expect(store.session.state.results).toHaveLength(0)
  await button(wrapper, '還不熟')
  expect(store.session.state.results).toHaveLength(1)
  expect(store.session.state.streak).toBe(1)
  vi.spyOn(Math, 'random').mockReturnValue(0)
  await button(wrapper, '讀音測驗')
  const word = wrapper.find('.q-card .text-3xl').text(),
    v = vocab.find((x) => x.w === word)!
  await button(wrapper, v.r)
  const length = store.session.state.results.length
  await button(wrapper, '標為已掌握')
  expect(store.session.state.results).toHaveLength(length)
  await router.push('/vocab?study=due')
  await flushPromises()
  expect(wrapper.text()).toContain('到期')
  expect(wrapper.findAll('.flashcard').length).toBe(0) // still quiz mode
  await button(wrapper, '翻卡記憶')
  expect(wrapper.find('.flashcard').exists()).toBe(true)
  // A successful due review removes that word on the next round.
  vi.setSystemTime(new Date('2026-10-17T12:00:00'))
  await vi.advanceTimersByTimeAsync(1000)
  await wrapper.find('.flashcard').trigger('click')
  await button(wrapper, '記住了')
  await button(wrapper, '開始下一輪到期複習')
  expect(wrapper.text()).toContain('目前沒有到期單字')
})
it('listening submits once to the same reducer and leaves latest correctness separate from answered', async () => {
  const store = useProgressStore()
  const { wrapper } = await page(ListeningPage, '/listening')
  expect(store.session.state.results).toHaveLength(0)
  await button(wrapper, listening[0].distractors[0])
  await button(wrapper, listening[0].answer)
  expect(store.session.state.results).toHaveLength(1)
  expect(store.session.state.lDone.n3).toEqual(['l-test'])
  expect(store.session.state.lCorrect.n3).toEqual([])
})
it('review freezes its queue, supports mixed failures, retries, filters and does not erase unavailable summaries', async () => {
  const store = useProgressStore()
  store.recordLearning(submitted('grammar', 'g-0'))
  store.recordLearning(submitted('grammar', 'gone'))
  store.recordLearning(submitted('vocab', vocab[0].w))
  let fail = true
  vi.spyOn(questionBank, 'resolve').mockImplementation(async (r) =>
    r.id === 'gone'
      ? { status: 'unavailable' }
      : r.kind === 'vocab'
        ? { status: 'ready', item: vocab[0] }
        : fail
          ? { status: 'error' }
          : { status: 'ready', item: grammar[0] },
  )
  const { wrapper } = await page(ReviewPage, '/review')
  await wrapper.find('select').setValue('grammar')
  await flushPromises()
  expect(wrapper.text()).toContain('題庫請求失敗')
  fail = false
  await button(wrapper, '重試此題')
  await button(wrapper, grammar[0].answer)
  expect(wrapper.text()).toContain(grammar[0].explanation)
  expect(wrapper.text()).toContain('本輪固定 2 題')
  await button(wrapper, '下一題')
  expect(wrapper.text()).toContain('題目已不可用')
  expect(store.session.state.mistakes[itemKey(submitted('grammar', 'gone').ref)].pending).toBe(true)
  await button(wrapper, '開始下一輪')
  expect(wrapper.text()).toContain('本輪固定 1 題')
})
it('expired daily mode returns to today; midnight submissions do not backfill yesterday', async () => {
  const store = useProgressStore()
  await store.buildPlan('reading')
  const old = localDate(),
    plan = store.session.state.plans[dayKey(old, 'n3')]
  const { wrapper } = await page(GrammarPage, `/grammar?study=daily&date=${old}&group=grammar`)
  vi.setSystemTime(new Date('2026-10-17T00:00:01'))
  await vi.advanceTimersByTimeAsync(1000)
  expect(wrapper.text()).toContain('已過期')
  expect(wrapper.find('.option-btn').exists()).toBe(false)
  store.recordLearning(submitted('grammar', plan.groups.grammar!.targets[0].id))
  expect(inspectGroup(store.session.state, plan, 'grammar', grammar).done).toBe(0)
  expect(store.session.state.days[dayKey('2026-10-17', 'n3')].items).toHaveLength(1)
})
it('repairs only missing targets, preserves valid IDs and completion; zero never appears complete', async () => {
  const store = useProgressStore()
  await store.buildPlan('reading')
  const key = dayKey(localDate(), 'n3'),
    old = store.session.state.plans[key].groups.grammar!.targets.map((r) => r.id)
  store.recordLearning(submitted('grammar', old[0]))
  vi.mocked(questionBank.load).mockResolvedValue({
    items: grammar.filter((g) => g.id !== old[1]),
    failed: false,
  })
  await store.repairPlan(localDate(), 'n3', 'grammar')
  const p = store.session.state.plans[key]
  expect(p.groups.grammar!.targets.map((r) => r.id)).toEqual(
    expect.arrayContaining(old.filter((id) => id !== old[1])),
  )
  expect(inspectGroup(store.session.state, p, 'grammar', grammar).done).toBe(1)
  expect(p.groups.grammar!.note).toContain('失效目標')
  vi.mocked(questionBank.load).mockResolvedValue({ items: [], failed: false })
  await store.repairPlan(localDate(), 'n3', 'grammar')
  expect(store.session.state.plans[key].groups.grammar!.status).toBe('empty')
  expect(
    inspectGroup(store.session.state, store.session.state.plans[key], 'grammar', []).complete,
  ).toBe(false)
})
it('locks only the started deep branch; quota leaves memory exportable and rejects overwrite', async () => {
  const store = useProgressStore()
  await store.buildPlan('reading')
  store.startPlan(localDate(), 'n3', 'vocab')
  await store.buildPlan('listening')
  store.startPlan(localDate(), 'n3', 'listening')
  await store.buildPlan('reading')
  expect(store.session.state.plans[dayKey(localDate(), 'n3')].branch).toBe('listening')
  const disk = localStorage.getItem(STORAGE_KEY)
  vi.stubGlobal('localStorage', {
    getItem: localStorage.getItem.bind(localStorage),
    setItem: () => {
      throw Error('quota')
    },
  })
  store.recordLearning(submitted('vocab', vocab[0].w))
  expect(store.storageAvailable).toBe(false)
  expect(JSON.parse(decodeURIComponent(atob(store.exportCode()))).state.results).toHaveLength(1)
  const before = JSON.stringify(store.session)
  expect(() => store.importCode(encodeCode(defaultState()))).toThrow()
  expect(JSON.stringify(store.session)).toBe(before)
  expect(localStorage.getItem(STORAGE_KEY)).toBe(disk)
})

it('home marks removed saved targets unavailable without replacing them, and retries checks without losing ready groups', async () => {
  const store = useProgressStore()
  await store.buildPlan('reading')
  const key = dayKey(localDate(), 'n3')
  const before = JSON.stringify(store.session.state.plans[key].groups.grammar)
  let fail = true
  vi.mocked(questionBank.load).mockImplementation(async (kind) =>
    kind === 'grammar'
      ? { items: fail ? [] : grammar.slice(1), failed: fail }
      : ({ items: banks[kind], failed: false } as never),
  )
  const { wrapper } = await page(HomePage, '/')
  expect(wrapper.text()).toContain('完成量暫無法確認')
  expect(JSON.stringify(store.session.state.plans[key].groups.grammar)).toBe(before)
  fail = false
  await button(wrapper, '重試目標檢查')
  expect(wrapper.text()).toContain('1 個目標已不可用')
  expect(JSON.stringify(store.session.state.plans[key].groups.grammar)).toBe(before)
})
it('zero daily targets and empty due/review states never claim completion and offer a return path', async () => {
  const store = useProgressStore()
  vi.mocked(questionBank.load).mockResolvedValue({ items: [], failed: false })
  await store.buildPlan('reading')
  const { wrapper } = await page(VocabPage, `/vocab?study=daily&date=${localDate()}&group=vocab`)
  expect(wrapper.text()).toContain('零目標不算完成')
  expect(wrapper.text()).not.toContain('本組目標已做完')
  const review = await page(ReviewPage, '/review')
  expect(review.wrapper.text()).toContain('沒有待複習錯題')
  expect(review.wrapper.find('a').exists()).toBe(true)
  vi.mocked(questionBank.load).mockResolvedValue({ items: vocab, failed: false })
  const due = await page(VocabPage, '/vocab?study=due')
  expect(due.wrapper.text()).toContain('目前沒有到期單字')
  expect(due.wrapper.text()).toContain('自由練習')
  expect(due.wrapper.find('.flashcard').exists()).toBe(false)
})
it('runs daily → four kinds → review → next-day due → export/import → restore with complete new state', async () => {
  const store = useProgressStore()
  await store.buildPlan('reading')
  const date = localDate(),
    key = dayKey(date, 'n3')
  const v = await page(VocabPage, `/vocab?study=daily&date=${date}&group=vocab`)
  await v.wrapper.find('.flashcard').trigger('click')
  await button(v.wrapper, '還不熟')
  const g = await page(GrammarPage, `/grammar?study=daily&date=${date}&group=grammar`)
  await button(g.wrapper, grammar[0].answer)
  const r = await page(ReadingPage, `/reading?study=daily&date=${date}&group=reading`)
  await r.wrapper.find('.reading-list-item').trigger('click')
  await button(r.wrapper, grammar[0].answer)
  await button(r.wrapper, grammar[1].answer)
  const l = await page(ListeningPage, '/listening')
  await button(l.wrapper, listening[0].answer)
  const review = await page(ReviewPage, '/review')
  await review.wrapper.find('.flashcard').trigger('click')
  await button(review.wrapper, '記住了')
  expect(store.session.state.mistakes[itemKey(submitted('vocab', vocab[0].w).ref)].pending).toBe(
    false,
  )
  expect(store.session.state.plans[key].groups.vocab!.targets).toHaveLength(10)
  expect(store.session.state.rDone.n3).toEqual(['r-test'])
  vi.setSystemTime(new Date('2026-10-17T12:00:00'))
  const due = await page(VocabPage, '/vocab?study=due')
  await due.wrapper.find('.flashcard').trigger('click')
  await button(due.wrapper, '記住了')
  expect(store.session.state.streak).toBe(2)
  const exported = store.exportCode(),
    expected = JSON.parse(JSON.stringify(store.session.state))
  store.importCode(encodeCode(defaultState()))
  expect(store.session.state.results).toEqual([])
  store.restore()
  expect(store.session.state).toEqual(expected)
  store.importCode(exported)
  expect(store.session.state).toEqual(expected)
  expect(store.session.backups).toHaveLength(3)
})
it('failed daily bank loading is retryable and never labels target IDs unavailable before success', async () => {
  const store = useProgressStore()
  await store.buildPlan('reading')
  const targets = JSON.stringify(
    store.session.state.plans[dayKey(localDate(), 'n3')].groups.grammar,
  )
  let fail = true
  vi.mocked(questionBank.load).mockImplementation(async () => ({
    items: fail ? [] : grammar,
    failed: fail,
  }))
  const { wrapper } = await page(
    GrammarPage,
    `/grammar?study=daily&date=${localDate()}&group=grammar`,
  )
  expect(wrapper.text()).toContain('載入失敗')
  expect(wrapper.text()).not.toContain('已不可用')
  expect(wrapper.text()).not.toContain('已做完')
  fail = false
  await button(wrapper, '重新載入')
  expect(wrapper.find('.option-btn').exists()).toBe(true)
  expect(JSON.stringify(store.session.state.plans[dayKey(localDate(), 'n3')].groups.grammar)).toBe(
    targets,
  )
})
