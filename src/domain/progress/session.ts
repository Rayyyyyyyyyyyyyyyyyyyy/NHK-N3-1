import { decodeCode, normalize, type ProgressState } from './state'
import type { ProgressStorage, Snapshot } from '../../services/progressStorage'
export function createProgressSession(storage: ProgressStorage) {
  return {
    state: storage.load(),
    backups: storage.backups(),
    replace(next: ProgressState, reason: Snapshot['reason']) {
      const backups = [
        ...this.backups,
        { state: normalize(this.state), at: new Date().toISOString(), reason },
      ].slice(-10)
      // Without a durable snapshot, an import must not destroy in-memory learning.
      if (!storage.saveBackups(backups))
        throw Error('無法保存撤銷備份，進度尚未覆寫。請先匯出進度碼。')
      this.backups = backups
      this.state = next
      storage.save(this.state)
    },
    importCode(code: string) {
      const next = decodeCode(code)
      this.replace(next, '匯入前')
    },
    restore(index?: number): boolean {
      const snapshot = this.backups[index ?? this.backups.length - 1]
      if (!snapshot) return false
      this.replace(normalize(snapshot.state), '撤銷前')
      return true
    },
  }
}
