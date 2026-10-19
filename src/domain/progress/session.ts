import { decodeCode, cloneState, type ProgressState } from './state'
import { validateV5 } from './validation'
import type { ProgressStorage, Snapshot } from '../../services/progressStorage'
import { systemClock, type Clock } from '../learning/types'
import { localDate } from '../learning/calendar'
export function createProgressSession(storage: ProgressStorage, clock: Clock = systemClock) {
  const loaded = storage.loadDocument()
  return {
    state: loaded.state,
    backups: loaded.backups,
    commit(next: ProgressState) {
      const saved = storage.saveDocument({ version: 5, state: next, backups: this.backups })
      this.state = next
      return saved
    },
    replace(next: ProgressState, reason: Snapshot['reason']) {
      if (!validateV5(next)) throw Error('進度驗證失敗，尚未覆寫。')
      const backups = [
        ...this.backups,
        { state: cloneState(this.state), at: clock().toISOString(), reason },
      ].slice(-10)
      if (!storage.saveDocument({ version: 5, state: next, backups }, true))
        throw Error('無法保存完整進度與撤銷備份，進度尚未覆寫。請先匯出進度碼。')
      this.backups = backups
      this.state = cloneState(next)
    },
    importCode(code: string) {
      this.replace(decodeCode(code, localDate(clock())), '匯入前')
    },
    restore(index?: number): boolean {
      const snapshot = this.backups[index ?? this.backups.length - 1]
      if (!snapshot) return false
      this.replace(cloneState(snapshot.state), '撤銷前')
      return true
    },
  }
}
