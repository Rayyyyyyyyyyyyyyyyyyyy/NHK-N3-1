<script setup lang="ts">
defineProps<{ loading: boolean; failed: boolean; empty: boolean; emptyText: string }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="loading" class="card" role="status">載入中…</div>
  <div v-else-if="failed" class="card" role="alert">
    <p>題庫載入失敗，請稍後再試。</p>
    <button class="btn btn-outline" @click="$emit('retry')">重新載入</button>
  </div>
  <p v-else-if="empty" class="text-muted py-3">{{ emptyText }}</p>
</template>
