import { useEffect, useReducer, useCallback, useMemo } from 'react'
import { loadState, saveState } from '../storage/appStorage'
import { MAX_HISTORY, MAX_LIST_LEN, type AppState } from '../domain/model'
import type { LotteryResult } from '../domain/lottery'

// ---- Actions ----
type Action =
  | { type: 'ADD'; kind: 'fillings'; name: string }
  | { type: 'REMOVE'; kind: 'fillings'; name: string }
  | { type: 'UPDATE'; kind: 'fillings'; name: string; newName: string }
  | { type: 'ADD'; kind: 'seasonings'; name: string }
  | { type: 'REMOVE'; kind: 'seasonings'; name: string }
  | { type: 'UPDATE'; kind: 'seasonings'; name: string; newName: string }
  | { type: 'RECORD_DRAW'; results: LotteryResult[] }
  | { type: 'CLEAR_HISTORY' }

type ListKind = 'fillings' | 'seasonings'

const isValidName = (name: string): boolean =>
  name.length > 0 && name.length <= MAX_LIST_LEN

// ---- Reducer(純関数) ----
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD': {
      const list = state[action.kind]
      if (!isValidName(action.name) || list.includes(action.name)) return state
      return { ...state, [action.kind]: [...list, action.name] }
    }
    case 'REMOVE': {
      const list = state[action.kind]
      // 具リストは最低1件必須
      if (action.kind === 'fillings' && list.length <= 1) return state
      if (!list.includes(action.name)) return state
      return {
        ...state,
        [action.kind]: list.filter((x) => x !== action.name),
      }
    }
    case 'UPDATE': {
      const list = state[action.kind]
      if (!isValidName(action.newName)) return state
      if (list.includes(action.newName) || !list.includes(action.name))
        return state
      return {
        ...state,
        [action.kind]: list.map((x) => (x === action.name ? action.newName : x)),
      }
    }
    case 'RECORD_DRAW': {
      const history = [...state.history, { results: action.results, at: Date.now() }]
      return { ...state, history: history.slice(-MAX_HISTORY) }
    }
    case 'CLEAR_HISTORY':
      return { ...state, history: [] }
  }
}

// ---- Hook ----
export interface UseAppState {
  state: AppState
  storageAvailable: boolean
  addFilling: (name: string) => boolean
  removeFilling: (name: string) => boolean
  updateFilling: (name: string, newName: string) => boolean
  addSeasoning: (name: string) => boolean
  removeSeasoning: (name: string) => boolean
  updateSeasoning: (name: string, newName: string) => boolean
  recordDraw: (results: LotteryResult[]) => void
  clearHistory: () => void
}

export function useAppState(): UseAppState {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [storageAvailable] = useStateWithStorageProbe()

  useEffect(() => {
    saveState(state)
  }, [state])

  const mkListOps = (kind: ListKind) => ({
    add: (name: string) => {
      const prev = state[kind]
      dispatch({ type: 'ADD', kind, name })
      return isValidName(name) && !prev.includes(name)
    },
    remove: (name: string) => {
      const prev = state[kind]
      dispatch({ type: 'REMOVE', kind, name })
      const removable =
        (kind !== 'fillings' || prev.length > 1) && prev.includes(name)
      return removable
    },
    update: (name: string, newName: string) => {
      const prev = state[kind]
      dispatch({ type: 'UPDATE', kind, name, newName })
      return (
        isValidName(newName) &&
        !prev.includes(newName) &&
        prev.includes(name)
      )
    },
  })

  const fillingOps = useMemo(() => mkListOps('fillings'), [state.fillings])
  const seasoningOps = useMemo(() => mkListOps('seasonings'), [state.seasonings])

  const recordDraw = useCallback((results: LotteryResult[]) => {
    dispatch({ type: 'RECORD_DRAW', results })
  }, [])
  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' })
  }, [])

  return {
    state,
    storageAvailable,
    addFilling: fillingOps.add,
    removeFilling: fillingOps.remove,
    updateFilling: fillingOps.update,
    addSeasoning: seasoningOps.add,
    removeSeasoning: seasoningOps.remove,
    updateSeasoning: seasoningOps.update,
    recordDraw,
    clearHistory,
  }
}

// localStorage 可用性プローブ(1回のみ)
function useStateWithStorageProbe(): [boolean] {
  const [ok] = useMemo(() => {
    try {
      const probe = '__onigiri_probe__'
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return [true]
    } catch {
      return [false]
    }
  }, [])
  return [ok]
}
