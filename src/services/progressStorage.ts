import { defaultState, type ProgressState } from '../domain/progress/state'
import { validateV4, validateV5, validTimestamp, object } from '../domain/progress/validation'
import { upgradeV4 } from '../domain/progress/upgrade'
import { localDate } from '../domain/learning/calendar'
import { systemClock, type Clock } from '../domain/learning/types'
export const STORAGE_KEY = 'nihongo_dojo_v5'
export const LEGACY_KEY = 'nihongo_dojo_v4'
export const BACKUP_KEY = 'nihongo_dojo_v4_backups'
export interface Snapshot {
  state: ProgressState
  at: string
  reason: '匯入前' | '撤銷前'
}
export interface ProgressDocument {
  version: 5
  state: ProgressState
  backups: Snapshot[]
}
export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
function validSnapshot(x: unknown, legacy = false): boolean {
  return (
    object(x) &&
    Object.keys(x).length === 3 &&
    (legacy ? validateV4(x.state) : validateV5(x.state)) &&
    validTimestamp(x.at) &&
    ['匯入前', '撤銷前'].includes(x.reason as string)
  )
}
export function createProgressStorage(port?: StoragePort, clock: Clock = systemClock) {
  const storage = () => port ?? globalThis.localStorage
  let blocked = false,
    error = '',
    rawSource: string | null = null,
    available = true
  function saveDocument(document: ProgressDocument, explicit = false): boolean {
    if (blocked && !explicit) return false
    try {
      storage().setItem(STORAGE_KEY, JSON.stringify(document))
      blocked = false
      error = ''
      available = true
      return true
    } catch {
      available = false
      error = '無法保存進度，請匯出最新記憶體進度碼。'
      return false
    }
  }
  function loadDocument(): ProgressDocument {
    const empty: ProgressDocument = { version: 5, state: defaultState(), backups: [] }
    let raw: string | null
    try {
      raw = storage().getItem(STORAGE_KEY)
    } catch {
      blocked = true
      available = false
      error = '無法讀取儲存資料，目前使用記憶體練習；請匯出備份。'
      return empty
    }
    if (raw !== null) {
      rawSource = raw
      try {
        const p: unknown = JSON.parse(raw)
        if (
          !object(p) ||
          Object.keys(p).length !== 3 ||
          p.version !== 5 ||
          !validateV5(p.state) ||
          !Array.isArray(p.backups) ||
          p.backups.length > 10 ||
          !p.backups.every((x) => validSnapshot(x))
        )
          throw Error()
        return p as unknown as ProgressDocument
      } catch {
        blocked = true
        available = false
        error =
          'v5 儲存文件損毀，已保留原始資料並停止自動覆寫。可匯出記憶體進度，或用有效進度碼明確恢復。'
        return empty
      }
    }
    try {
      const legacyRaw = storage().getItem(LEGACY_KEY)
      if (legacyRaw === null) return empty
      rawSource = legacyRaw
      const legacy: unknown = JSON.parse(legacyRaw)
      if (!validateV4(legacy)) throw Error()
      const today = localDate(clock())
      const doc: ProgressDocument = { version: 5, state: upgradeV4(legacy, today), backups: [] }
      // An invalid backup must not prevent preserving a valid main state.
      try {
        const backups: unknown = JSON.parse(storage().getItem(BACKUP_KEY) ?? '[]')
        if (Array.isArray(backups))
          doc.backups = backups
            .filter((x) => validSnapshot(x, true))
            .slice(-10)
            .map((x) => ({ ...x, state: upgradeV4(x.state, today) }))
      } catch {
        /* Keep the original v4 backup key untouched. */
      }
      saveDocument(doc)
      return doc
    } catch {
      blocked = true
      available = false
      error = '舊進度無法完整驗證，已保留原始資料並停止自動覆寫。'
      return empty
    }
  }
  return {
    loadDocument,
    saveDocument,
    get available() {
      return available && !blocked
    },
    get error() {
      return error
    },
    get rawSource() {
      return rawSource
    },
    remove(): boolean {
      try {
        storage().removeItem(STORAGE_KEY)
        return true
      } catch {
        return false
      }
    },
  }
}
export type ProgressStorage = ReturnType<typeof createProgressStorage>
