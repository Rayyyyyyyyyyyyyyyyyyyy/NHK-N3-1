import {
  defaultState,
  normalize,
  isProgressPayload,
  type ProgressState,
} from '../domain/progress/state'
export const STORAGE_KEY = 'nihongo_dojo_v4'
export const BACKUP_KEY = 'nihongo_dojo_v4_backups'
export interface Snapshot {
  state: ProgressState
  at: string
  reason: '匯入前' | '撤銷前'
}
export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
export function createProgressStorage(port?: StoragePort) {
  const storage = () => port ?? globalThis.localStorage
  return {
    load(): ProgressState {
      try {
        const raw = storage().getItem(STORAGE_KEY)
        return raw ? normalize(JSON.parse(raw)) : defaultState()
      } catch {
        return defaultState()
      }
    },
    save(state: ProgressState): boolean {
      try {
        storage().setItem(STORAGE_KEY, JSON.stringify(state))
        return true
      } catch {
        return false
      }
    },
    backups(): Snapshot[] {
      try {
        const p: unknown = JSON.parse(storage().getItem(BACKUP_KEY) ?? '[]')
        if (!Array.isArray(p)) return []
        return p
          .filter(
            (x) =>
              x &&
              isProgressPayload(x.state) &&
              typeof x.at === 'string' &&
              ['匯入前', '撤銷前'].includes(x.reason),
          )
          .slice(-10)
          .map((x) => ({ ...x, state: normalize(x.state) }))
      } catch {
        return []
      }
    },
    saveBackups(s: Snapshot[]): boolean {
      try {
        storage().setItem(BACKUP_KEY, JSON.stringify(s))
        return true
      } catch {
        return false
      }
    },
    remove(): boolean {
      try {
        storage().removeItem(STORAGE_KEY)
        storage().removeItem(BACKUP_KEY)
        return true
      } catch {
        return false
      }
    },
  }
}
export type ProgressStorage = ReturnType<typeof createProgressStorage>
