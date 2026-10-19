import { computed, inject, ref, watch, type Ref } from 'vue'
import { routeLocationKey } from 'vue-router'
import { useNow } from '@vueuse/core'
import type { Banks, BankKind } from '../domain/questions'
import { useProgressStore } from '../stores/progress'
import { localDate } from '../domain/learning/calendar'
import { dayKey } from '../domain/learning/types'
import { unfinished } from '../domain/learning/plans'
export function useStudySession<K extends BankKind>(kind: K, items: Ref<Banks[K][]>) {
  const route = inject(routeLocationKey, undefined),
    store = useProgressStore(),
    level = store.session.state.level
  const now = useNow({ interval: 1000 }),
    today = computed(() => localDate(now.value))
  const daily = computed(() => route?.query.study === 'daily'),
    due = computed(() => route?.query.study === 'due')
  const invalid = computed(
    () =>
      daily.value &&
      (route?.query.date !== today.value ||
        route?.query.group !== kind ||
        !store.session.state.plans[dayKey(today.value, level)]?.groups[kind]),
  )
  const noTargets = computed(
    () =>
      daily.value &&
      !invalid.value &&
      store.session.state.plans[dayKey(today.value, level)]?.groups[kind]?.targets.length === 0,
  )
  const selected = ref<Banks[K][]>([]) as Ref<Banks[K][]>,
    missing = ref(0),
    round = ref(0)
  function reset() {
    round.value++
    missing.value = 0
    if (!daily.value) {
      selected.value = items.value
      return
    }
    if (invalid.value) {
      selected.value = []
      return
    }
    const plan = store.session.state.plans[dayKey(today.value, level)]
    const refs = unfinished(store.session.state, plan, kind)
    const all = plan.groups[kind]?.targets ?? []
    const find = (id: string) =>
      items.value.find((x) =>
        kind === 'vocab' ? (x as Banks['vocab']).w === id : (x as Banks['grammar']).id === id,
      )
    missing.value = all.filter((r) => !find(r.id)).length
    selected.value = refs.flatMap((r) => {
      const item = find(r.id)
      return item ? [item] : []
    })
    if (items.value.length && !plan.started) store.startPlan(today.value, level, kind)
  }
  watch([items, () => route?.fullPath, today], reset, { immediate: true })
  return { daily, due, invalid, noTargets, selected, missing, round, today, reset }
}
