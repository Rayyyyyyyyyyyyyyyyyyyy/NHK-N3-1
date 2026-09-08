import { shallowRef, ref, onMounted } from 'vue'
import { questionBank } from '../services/questionBank'
import type { Banks, BankKind } from '../domain/questions'
import type { Level } from '../domain/progress/state'
export function useQuestionBank<K extends BankKind>(kind: K, level: Level) {
  const items = shallowRef<Banks[K][]>([]),
    loading = ref(true),
    failed = ref(false)
  async function retry() {
    loading.value = true
    const result = await questionBank.load(kind, level)
    items.value = result.items
    failed.value = result.failed
    loading.value = false
  }
  onMounted(retry)
  return { items, loading, failed, retry }
}
