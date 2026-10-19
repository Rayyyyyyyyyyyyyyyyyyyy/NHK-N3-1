<script setup lang="ts">
defineProps<{ name: 'home' | 'vocab' | 'grammar' | 'reading' | 'listening' | 'review' }>()
const paths = {
  home: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
  vocab: 'M8 3h12v15H8zM4 7v14h12M11 7h6M11 11h4',
  grammar: 'm4 16-1 5 5-1L20 8l-4-4L4 16Zm10-10 4 4M4 16l4 4',
  reading: 'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5Z',
  listening: 'M4 14v-3a8 8 0 0 1 16 0v3M4 13H3v7h4v-7H4Zm16 0h1v7h-4v-7h3Z',
  review: 'M4 9a8 8 0 1 1 0 6M4 4v5h5M12 7v5l3 2',
}
</script>
<template>
  <svg
    class="nav-icon"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
