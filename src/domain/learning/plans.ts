import type { Banks } from '../questions'
import type { ProgressState, Level } from '../progress/state'
import {
  dayKey,
  itemKey,
  type StudyItemRef,
  type StudyKind,
  type DailyGroup,
  type DailyPlan,
} from './types'
export function refsFor<K extends StudyKind>(
  kind: K,
  level: Level,
  items: Banks[K][],
): StudyItemRef[] {
  return [
    ...new Map(
      items.map((item) => {
        const id = kind === 'vocab' ? (item as Banks['vocab']).w : (item as Banks['grammar']).id
        const ref: StudyItemRef = {
          level,
          kind,
          id,
          ...(kind === 'reading' ? { articleId: id } : {}),
        }
        return [itemKey(ref), ref]
      }),
    ).values(),
  ]
}
export function priority(state: ProgressState, ref: StudyItemRef, today: string): [number, string] {
  const key = itemKey(ref),
    { level, kind, id } = ref,
    schedule = state.schedules[key]
  if (kind === 'vocab') {
    if (schedule && schedule.dueOn <= today) return [0, schedule.dueOn]
    if (!schedule && (state.mistakes[key]?.pending || Object.hasOwn(state.vLearning[level], id)))
      return [1, '']
    if (
      !Object.hasOwn(state.vKnown[level], id) &&
      !Object.hasOwn(state.vLearning[level], id) &&
      !schedule
    )
      return [2, '']
    return [3, '']
  }
  if (kind === 'grammar')
    return [state.mistakes[key]?.pending ? 0 : state.gDone[level].includes(id) ? 2 : 1, '']
  return [
    (kind === 'reading' ? state.rDone[level] : state.lCorrect[level]).includes(id) ? 1 : 0,
    '',
  ]
}
export function orderRefs(
  state: ProgressState,
  refs: StudyItemRef[],
  today: string,
): StudyItemRef[] {
  return [...refs].sort((a, b) => {
    const pa = priority(state, a, today),
      pb = priority(state, b, today)
    return pa[0] - pb[0] || pa[1].localeCompare(pb[1]) || itemKey(a).localeCompare(itemKey(b))
  })
}
export const taskLimit = { vocab: 10, grammar: 5, reading: 1, listening: 3 }
export function generateGroup(
  state: ProgressState,
  refs: StudyItemRef[],
  kind: StudyKind,
  today: string,
): DailyGroup {
  const targets = orderRefs(state, refs, today).slice(0, taskLimit[kind])
  return { status: targets.length ? 'ready' : 'empty', targets, note: '' }
}
export function groupProgress(state: ProgressState, plan: DailyPlan, kind: StudyKind) {
  const group = plan.groups[kind],
    day = state.days[dayKey(plan.date, plan.level)]
  const targets = group?.targets ?? []
  const done = targets.filter((r) =>
    kind === 'reading' ? day?.articles.includes(r.id) : day?.items.includes(itemKey(r)),
  ).length
  const correct = targets.filter((r) =>
    kind === 'reading'
      ? state.rDone[plan.level].includes(r.id)
      : day?.correctItems.includes(itemKey(r)),
  ).length
  return {
    done,
    total: targets.length,
    correct,
    complete: targets.length > 0 && done === targets.length,
  }
}
export function unfinished(state: ProgressState, plan: DailyPlan, kind: StudyKind) {
  const day = state.days[dayKey(plan.date, plan.level)]
  return (plan.groups[kind]?.targets ?? []).filter(
    (r) => !(kind === 'reading' ? day?.articles.includes(r.id) : day?.items.includes(itemKey(r))),
  )
}
export function vocabQueue(
  items: Banks['vocab'][],
  state: ProgressState,
  level: Level,
  today: string,
  dueOnly = false,
) {
  let refs = refsFor('vocab', level, items)
  if (dueOnly) refs = refs.filter((r) => state.schedules[itemKey(r)]?.dueOn <= today)
  return orderRefs(state, refs, today)
    .slice(0, 10)
    .map((r) => items.find((v) => v.w === r.id)!)
}
