import { normalizeState, type AppState } from '../domain/model'

export const STORAGE_KEY = 'onigiri-lottery'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return normalizeState(null)
    return normalizeState(JSON.parse(raw))
  } catch {
    return normalizeState(null)
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
