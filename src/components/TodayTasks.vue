<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNow } from '@vueuse/core'
import { RouterLink } from 'vue-router'
import { useProgressStore } from '../stores/progress'
import { localDate } from '../domain/learning/calendar'
import { questionBank } from '../services/questionBank'
import { dayKey, type StudyKind } from '../domain/learning/types'
import { inspectGroup } from '../domain/learning/plans'
import { BANK_KINDS, type Banks } from '../domain/questions'
const store = useProgressStore(),
  now = useNow({ interval: 1000 }),
  today = computed(() => localDate(now.value)),
  level = computed(() => store.session.state.level)
const plan = computed(() => store.session.state.plans[dayKey(today.value, level.value)]),
  branch = ref<'reading' | 'listening'>('reading'),
  repairError = ref('')
watch(
  () => plan.value?.branch,
  (value) => {
    if (value) branch.value = value
  },
  { immediate: true },
)
const labels = { vocab: '單字', grammar: '文法', reading: '讀解', listening: '聽力' }
const groups = computed(
  () => ['vocab', 'grammar', plan.value?.branch ?? branch.value] as StudyKind[],
)
function status(kind: StudyKind) {
  return (
    store.taskStatus[JSON.stringify([dayKey(today.value, level.value), kind])] ??
    plan.value?.groups[kind]?.status ??
    'uncreated'
  )
}
const arranging = computed(() => groups.value.some((kind) => status(kind) === 'pending'))
const needsBuild = computed(
  () =>
    !plan.value ||
    (!plan.value.started && branch.value !== plan.value.branch) ||
    groups.value.some((kind) => !plan.value?.groups[kind]),
)
type TargetCheck = { status: 'pending' | 'error' | 'ready'; items?: Banks[StudyKind][] }
const checks = ref<Partial<Record<StudyKind, TargetCheck>>>({})
let checkGeneration = 0
async function checkTargets(kind: StudyKind, generation = checkGeneration) {
  const origin = plan.value,
    group = origin?.groups[kind]
  if (!origin || !group || group.status !== 'ready') return
  checks.value[kind] = { status: 'pending' }
  const result = await questionBank.load(kind, origin.level)
  if (generation !== checkGeneration) return
  if (result.failed) {
    checks.value[kind] = { status: 'error' }
    return
  }
  checks.value[kind] = { status: 'ready', items: result.items }
}
watch(
  [today, level, () => JSON.stringify(plan.value?.groups)],
  () => {
    checkGeneration++
    checks.value = {}
    for (const kind of groups.value) void checkTargets(kind)
  },
  { immediate: true },
)
const progress = computed(
  () =>
    Object.fromEntries(
      BANK_KINDS.map((kind) => {
        const check = checks.value[kind]
        return [
          kind,
          plan.value
            ? inspectGroup(
                store.session.state,
                plan.value,
                kind,
                check?.status === 'ready' ? check.items : undefined,
              )
            : { done: 0, total: 0, correct: 0, complete: false, missing: [], selected: [] },
        ]
      }),
    ) as Record<StudyKind, ReturnType<typeof inspectGroup>>,
)
async function repair(kind: StudyKind) {
  repairError.value = ''
  try {
    await store.repairPlan(today.value, level.value, kind)
  } catch (e) {
    repairError.value = String(e)
  }
}
</script>
<template>
  <section class="card today-tasks" aria-labelledby="today-heading">
    <div class="section-heading">
      <div>
        <p class="section-eyebrow">ONE STEP AT A TIME</p>
        <h3 id="today-heading" class="card-title">今日任務</h3>
        <p class="section-description">{{ today }} · {{ level.toUpperCase() }}</p>
      </div>
      <span class="task-plan-badge">{{ plan ? '今日已安排' : '準備開始' }}</span>
    </div>
    <div class="task-plan-controls">
      <label class="task-branch-label" for="daily-branch"
        >深入練習<select id="daily-branch" v-model="branch" :disabled="plan?.started">
          <option value="reading">讀解 1 篇</option>
          <option value="listening">聽力最多 3 題</option>
        </select></label
      ><button
        class="btn task-build-button"
        :disabled="arranging || !needsBuild"
        @click="store.buildPlan(plan?.started ? plan.branch : branch)"
      >
        {{
          arranging
            ? '安排中…'
            : !needsBuild
              ? '今日已安排'
              : plan
                ? '更新／重試今日安排'
                : '建立今日任務'
        }}<span aria-hidden="true"> →</span>
      </button>
    </div>
    <p v-if="plan?.started" class="task-branch-note">
      今天的深入練習已固定為{{ labels[plan.branch] }}。
    </p>
    <div class="task-list">
      <div
        v-for="(kind, index) in groups"
        :key="kind"
        class="task-group"
        :class="{ 'task-complete': progress[kind].complete }"
      >
        <div class="task-number" aria-hidden="true">
          {{ progress[kind].complete ? '✓' : String(index + 1).padStart(2, '0') }}
        </div>
        <div class="task-content">
          <div class="task-heading">
            <h4>{{ labels[kind] }}</h4>
            <span v-if="status(kind) === 'uncreated'" class="task-state-label">待建立</span
            ><span v-else-if="checks[kind]?.status === 'ready'" class="task-quantity"
              >{{ progress[kind].done }} <span>/ {{ progress[kind].total }}</span></span
            >
          </div>
          <p v-if="status(kind) === 'pending'" role="status">載入中…</p>
          <p v-else-if="status(kind) === 'error'" class="task-error" role="alert">
            題庫載入失敗，請重試；其他已建立目標仍保留。
          </p>
          <p v-else-if="status(kind) === 'uncreated'" class="task-description">
            {{
              kind === 'vocab'
                ? '10 張單字，翻卡或讀音測驗'
                : kind === 'grammar'
                  ? '5 道文法，練習後看看解析'
                  : kind === 'reading'
                    ? '1 篇文章，細讀再作答'
                    : '3 道聽力，專注聽與理解'
            }}
          </p>
          <p v-else-if="status(kind) === 'empty'" class="task-description">
            此等級目前無可用題目。
          </p>
          <template v-else
            ><p v-if="checks[kind]?.status === 'pending'" role="status">檢查保存目標中…</p>
            <div v-else-if="checks[kind]?.status === 'error'" class="task-error" role="alert">
              <p>題庫請求失敗，完成量暫無法確認；已保存目標仍保留。</p>
              <button class="text-action" @click="checkTargets(kind)">重試目標檢查</button>
            </div>
            <p v-else-if="progress[kind].missing.length" class="task-error" role="status">
              {{ progress[kind].missing.length }} 個目標已不可用，請修復計畫；有效目標仍可續做。
            </p>
            <template v-if="checks[kind]?.status === 'ready'"
              ><div class="task-progress-track" aria-hidden="true">
                <div
                  :style="{
                    width: `${progress[kind].total ? (progress[kind].done / progress[kind].total) * 100 : 0}%`,
                  }"
                ></div>
              </div>
              <p class="task-description">
                已做 {{ progress[kind].done }} / {{ progress[kind].total
                }}<span v-if="progress[kind].complete"> · 本組完成</span
                ><span v-if="kind !== 'reading'">
                  · 最新答對／記住 {{ progress[kind].correct }}</span
                ><span v-else> · 整篇掌握另見讀解列表</span>
              </p></template
            >
            <div class="task-actions">
              <RouterLink
                class="btn btn-outline task-start"
                :to="{ path: `/${kind}`, query: { study: 'daily', date: today, group: kind } }"
                @click="store.startPlan(today, level, kind)"
                >{{
                  progress[kind].complete ? '查看練習' : progress[kind].done ? '繼續練習' : '開始'
                }}<span aria-hidden="true"> →</span></RouterLink
              ><button
                v-if="progress[kind].missing.length"
                class="text-action"
                @click="repair(kind)"
              >
                修復失效目標
              </button>
            </div></template
          >
          <p v-if="plan?.groups[kind]?.note" class="task-description" role="status">
            {{ plan.groups[kind]?.note }}
          </p>
        </div>
      </div>
    </div>
    <p class="task-footnote">
      做過就計入今日進度，任務完成不代表已掌握；答錯的題目可再到錯題複習鞏固。
    </p>
    <p v-if="repairError" class="status-msg err" role="alert">{{ repairError }}</p>
  </section>
</template>
