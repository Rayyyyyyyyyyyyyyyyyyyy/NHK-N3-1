<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { LEVELS, mapLevels, type Level } from '../domain/progress/state'
import { questionBank, type Counts } from '../services/questionBank'
import { useProgressStore } from '../stores/progress'
const store = useProgressStore(),
  s = computed(() => store.session.state)
const counts = ref<Counts>(
  mapLevels(() => ({ vocab: null, grammar: null, reading: null, listening: null })),
)
onMounted(async () => {
  counts.value = await questionBank.counts()
})
const rows = [
  { kind: 'vocab', label: '單字' },
  { kind: 'grammar', label: '文法' },
  { kind: 'reading', label: '讀解' },
  { kind: 'listening', label: '聽力' },
] as const
function count(lv: Level, kind: (typeof rows)[number]['kind']) {
  return kind === 'vocab'
    ? Object.keys(s.value.vKnown[lv]).length
    : s.value[kind === 'grammar' ? 'gDone' : kind === 'reading' ? 'rDone' : 'lCorrect'][lv].length
}
const rules: Partial<Record<Level, { next: Level; goal: number }>> = {
  n5: { next: 'n4', goal: 150 },
  n4: { next: 'n3', goal: 250 },
  n3: { next: 'n2', goal: 300 },
  n2: { next: 'n1', goal: 600 },
}
const advances = computed(() =>
  LEVELS.flatMap((lv) => {
    const rule = rules[lv]
    if (!rule) return []
    const total = counts.value[lv].grammar
    const ready =
      total !== null &&
      total > 0 &&
      s.value.gDone[lv].length >= total &&
      Object.keys(s.value.vKnown[lv]).length >= rule.goal
    return lv === s.value.level || ready
      ? [
          {
            lv,
            ...rule,
            ready,
            gGap: total === null ? null : Math.max(0, total - s.value.gDone[lv].length),
            vGap: Math.max(0, rule.goal - Object.keys(s.value.vKnown[lv]).length),
          },
        ]
      : []
  }),
)
const code = ref(''),
  status = ref(''),
  error = ref(false),
  textarea = ref<HTMLTextAreaElement>(),
  backupIndex = ref('')
const limits =
  '保留最近 10 份覆寫前快照；可選擇較早版本。備份僅存於此瀏覽器，清除資料或更換裝置即失效。'
function exportProgress() {
  code.value = store.exportCode()
  status.value = '已產生進度碼，可複製保存'
  error.value = false
}
function beginImport() {
  code.value = ''
  textarea.value?.focus()
}
function importProgress() {
  try {
    store.importCode(code.value)
    status.value = '✓ 進度已還原。' + limits
    error.value = false
    backupIndex.value = ''
  } catch (e) {
    status.value = e instanceof Error ? e.message : '匯入失敗'
    error.value = true
  }
}
function restore() {
  try {
    store.restore(backupIndex.value === '' ? undefined : Number(backupIndex.value))
    status.value = '已撤銷；再次撤銷可回到剛才的狀態。' + limits
    error.value = false
    backupIndex.value = ''
  } catch (e) {
    status.value = String(e)
    error.value = true
  }
}
</script>
<template>
  <h2 class="page-title">首頁</h2>
  <section class="card">
    <p class="card-title">整體進度</p>
    <div v-for="lv in LEVELS" :key="lv" class="level-progress-block">
      <p class="level-progress-heading">
        {{ lv.toUpperCase() }}<span v-if="lv === s.level" class="level-current-badge">修煉中</span>
      </p>
      <div v-for="row in rows" :key="row.kind" class="progress-row">
        <div class="progress-label">
          <span>{{ row.label }}</span
          ><span>{{ count(lv, row.kind) }} / {{ counts[lv][row.kind] ?? '未知' }}</span>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{
              width: `${counts[lv][row.kind] ? Math.min(100, (count(lv, row.kind) / counts[lv][row.kind]!) * 100) : 0}%`,
            }"
          ></div>
        </div>
      </div>
    </div>
  </section>
  <section class="card">
    <p class="card-title">進階建議</p>
    <div
      v-for="a in advances"
      :key="a.lv"
      class="advance-block"
      :class="{ 'advance-ready': a.ready }"
    >
      <template v-if="a.ready"
        ><p>🎉 {{ a.lv.toUpperCase() }} 基礎穩固，可以進入 {{ a.next.toUpperCase() }} 修煉！</p>
        <button class="btn btn-block" @click="store.setLevel(a.next)">
          切換到 {{ a.next.toUpperCase() }}
        </button></template
      >
      <p v-else>
        {{ a.lv.toUpperCase() }} 進階門檻：{{
          a.gGap === null ? '文法題數未知，暫無法判定' : `文法還差 ${a.gGap} 題`
        }}、單字還差 {{ a.vGap }} 字
      </p>
    </div>
    <div v-if="!advances.length" class="advance-block">
      <p>目前在 N1，已是最高等級，繼續保持！</p>
    </div>
  </section>
  <section class="card">
    <p class="card-title">今日菜單</p>
    <ul class="menu-list">
      <li>① 單字 10 分鐘：新字 10 張＋複習不熟的</li>
      <li>② 文法 10 分鐘：做 5 題並看解析</li>
      <li>③ 擇一深入：讀解一篇或聽力 3 題</li>
      <li>④ 有餘力：錯題重做</li>
    </ul>
  </section>
  <section class="card">
    <p class="card-title">進度備份</p>
    <div class="btn-row">
      <button class="btn btn-outline" @click="exportProgress">匯出進度碼</button
      ><button class="btn btn-outline" @click="beginImport">匯入進度碼</button>
    </div>
    <textarea
      ref="textarea"
      v-model="code"
      aria-label="進度碼"
      class="progress-code mt-2.5"
      placeholder="進度碼會顯示在這裡，或貼上要匯入的進度碼"
    ></textarea
    ><button class="btn btn-block mt-2" @click="importProgress">還原進度</button>
    <div v-if="store.session.backups.length" class="mt-3">
      <label for="backup">撤銷版本</label
      ><select id="backup" v-model="backupIndex" class="w-full mt-2">
        <option value="">上一步覆寫前</option>
        <option v-for="(backup, i) in store.session.backups" :key="i" :value="String(i)">
          {{ i + 1 }}. {{ backup.reason }} · {{ new Date(backup.at).toLocaleString() }}
        </option></select
      ><button class="btn btn-outline btn-block mt-2" @click="restore">撤銷／恢復所選版本</button>
    </div>
    <p class="text-xs text-subtle">{{ limits }}</p>
    <p class="status-msg" :class="error ? 'err' : 'ok'" role="status">{{ status }}</p>
  </section>
  <section class="card">
    <p class="card-title">備考路線</p>
    <p class="route-step"><b>N5・N4 打底：</b>把該級文法刷到全綠，單字每天 10 個新字，先建立語感</p>
    <p class="route-step"><b>第 1～3 個月：</b>文法 30 題刷到全綠、單字每天 10 個新字</p>
    <p class="route-step"><b>第 4～6 個月：</b>每天一篇 NHK 新聞，開始《新完全マスター読解 N2》</p>
    <p class="route-step"><b>第 7 個月起：</b>做 N2 模擬題，穩定 7 成後混入 N1 教材</p>
    <p class="route-step mb-0"><b>聽力日常：</b>日劇・「日本語の森」，先無字幕再開日文字幕</p>
  </section>
</template>
