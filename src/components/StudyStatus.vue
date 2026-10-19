<script setup lang="ts">
import { RouterLink } from 'vue-router'
defineProps<{
  daily: boolean
  invalid: boolean
  missing: number
  empty: boolean
  noTargets?: boolean
}>()
</script>
<template>
  <section v-if="daily" class="card" role="status">
    <template v-if="invalid"><p>此任務不存在或已過期，請返回建立今日任務。</p></template
    ><template v-else
      ><p>今日任務：依保存目標續做。完成表示做過，掌握與正確結果另計。</p>
      <p v-if="missing">{{ missing }} 個目標已不可用，請回首頁修復計畫。</p>
      <p v-else-if="noTargets">此等級目前無可用題目，零目標不算完成。</p>
      <p v-else-if="empty">本組目標已做完。</p></template
    >
    <div class="btn-row mt-3">
      <RouterLink to="/" class="btn btn-outline">返回今日任務</RouterLink
      ><RouterLink :to="$route.path" class="btn btn-outline">自由練習</RouterLink>
    </div>
  </section>
</template>
