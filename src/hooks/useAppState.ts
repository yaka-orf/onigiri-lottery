import { useEffect, useReducer, useCallback, useMemo } from 'react'
import { loadState, saveState } from '../storage/appStorage'
import {
  MAX_HISTORY,
  MAX_LIST_LEN,
  newHistoryId,
  pruneHistory,
  type AppState,
  type LotteryMode,
} from '../domain/model'
import type { LotteryResult } from '../domain/lottery'

// ---- Actions ----
type ListKind = 'fillings' | 'seasonings'
type Action =
  | { type: 'ADD'; kind: ListKind; name: string }
  | { type: 'REMOVE'; kind: ListKind; name: string }
  | { type: 'UPDATE'; kind: ListKind; name: string; newName: string }
  | { type: 'TOGGLE_EXCLUDE'; kind: ListKind; name: string }
  | { type: 'MOVE'; kind: ListKind; from: number; to: number }
  | { type: 'SET_MODE'; mode: LotteryMode }
  | { type: 'SET_COUNT'; count: number }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'RECORD_DRAW'; results: LotteryResult[] }
  | { type: 'TOGGLE_FAV'; id: string }
  | { type: 'CLEAR_HISTORY' }

const isValidName = (name: string): boolean =>
  name.length > 0 && name.length <= MAX_LIST_LEN

/** 除外を除いた実効リスト */
const effective = (state: AppState, kind: ListKind): string[] => {
  const list = state[kind]
  const excluded =
    kind === 'fillings' ? state.excludedFillings : state.excludedSeasonings
  return list.filter((x) => !excluded.includes(x))
}

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
      const exKey =
        action.kind === 'fillings' ? 'excludedFillings' : 'excludedSeasonings'
      const excluded = state[exKey].filter((x) => x !== action.name)
      return {
        ...state,
        [action.kind]: list.filter((x) => x !== action.name),
        [exKey]: excluded,
      }
    }
    case 'UPDATE': {
      const list = state[action.kind]
      if (!isValidName(action.newName)) return state
      if (list.includes(action.newName) || !list.includes(action.name))
        return state
      const exKey =
        action.kind === 'fillings' ? 'excludedFillings' : 'excludedSeasonings'
      const excluded = state[exKey].map((x) =>
        x === action.name ? action.newName : x,
      )
      return {
        ...state,
        [action.kind]: list.map((x) => (x === action.name ? action.newName : x)),
        [exKey]: excluded,
      }
    }
    case 'TOGGLE_EXCLUDE': {
      const list = state[action.kind]
      if (!list.includes(action.name)) return state
      const exKey =
        action.kind === 'fillings' ? 'excludedFillings' : 'excludedSeasonings'
      const excluded = state[exKey]
      if (excluded.includes(action.name)) {
        return { ...state, [exKey]: excluded.filter((x) => x !== action.name) }
      }
      // 全件除外は不可(実効リストが空になる場合)
      if (effective(state, action.kind).length <= 1) return state
      return { ...state, [exKey]: [...excluded, action.name] }
    }
    case 'MOVE': {
      const list = state[action.kind]
      const { from, to } = action
      // 範囲外・同位置は no-op
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= list.length ||
        to >= list.length
      )
        return state
      const next = [...list]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return { ...state, [action.kind]: next }
    }
    case 'SET_MODE':
      return { ...state, settings: { ...state.settings, mode: action.mode } }
    case 'SET_COUNT':
      return {
        ...state,
        settings: { ...state.settings, count: Math.min(10, Math.max(1, action.count)) },
      }
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled }
    case 'RECORD_DRAW': {
      const set = {
        id: newHistoryId(),
        results: action.results,
        at: Date.now(),
        fav: false,
      }
      const history = pruneHistory([...state.history, set], MAX_HISTORY)
      return { ...state, history }
    }
    case 'TOGGLE_FAV':
      return {
        ...state,
        history: state.history.map((h) =>
          h.id === action.id ? { ...h, fav: !h.fav } : h,
        ),
      }
    case 'CLEAR_HISTORY':
      return { ...state, history: [] }
  }
}

// ---- Hook ----
export interface UseAppState {
  state: AppState
  storageAvailable: boolean
  effectiveFillings: string[]
  effectiveSeasonings: string[]
  addFilling: (name: string) => boolean
  removeFilling: (name: string) => boolean
  updateFilling: (name: string, newName: string) => boolean
  toggleExcludeFilling: (name: string) => boolean
  moveFilling: (from: number, to: number) => void
  addSeasoning: (name: string) => boolean
  removeSeasoning: (name: string) => boolean
  updateSeasoning: (name: string, newName: string) => boolean
  toggleExcludeSeasoning: (name: string) => boolean
  moveSeasoning: (from: number, to: number) => void
  setLotteryMode: (mode: LotteryMode) => void
  setLotteryCount: (count: number) => void
  toggleSound: () => void
  recordDraw: (results: LotteryResult[]) => void
  toggleFavorite: (id: string) => void
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
    toggleExclude: (name: string) => {
      const excluded =
        kind === 'fillings' ? state.excludedFillings : state.excludedSeasonings
      const isExcluded = excluded.includes(name)
      dispatch({ type: 'TOGGLE_EXCLUDE', kind, name })
      if (isExcluded) return true // 解除は常に成功
      // 新規除外: 実効リストが2件以上ある場合のみ可
      const eff = effective(state, kind)
      return state[kind].includes(name) && eff.length > 1
    },
  })

  const fillingOps = useMemo(() => mkListOps('fillings'), [state])
  const seasoningOps = useMemo(() => mkListOps('seasonings'), [state])

  const setLotteryMode = useCallback((mode: LotteryMode) => {
    dispatch({ type: 'SET_MODE', mode })
  }, [])
  const setLotteryCount = useCallback((count: number) => {
    dispatch({ type: 'SET_COUNT', count })
  }, [])
  const toggleSound = useCallback(() => {
    dispatch({ type: 'TOGGLE_SOUND' })
  }, [])
  const mkMove = (kind: ListKind) => (from: number, to: number) => {
    dispatch({ type: 'MOVE', kind, from, to })
  }
  const moveFilling = useMemo(() => mkMove('fillings'), [])
  const moveSeasoning = useMemo(() => mkMove('seasonings'), [])
  const recordDraw = useCallback((results: LotteryResult[]) => {
    dispatch({ type: 'RECORD_DRAW', results })
  }, [])
  const toggleFavorite = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_FAV', id })
  }, [])
  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' })
  }, [])

  return {
    state,
    storageAvailable,
    effectiveFillings: effective(state, 'fillings'),
    effectiveSeasonings: effective(state, 'seasonings'),
    addFilling: fillingOps.add,
    removeFilling: fillingOps.remove,
    updateFilling: fillingOps.update,
    toggleExcludeFilling: fillingOps.toggleExclude,
    moveFilling,
    addSeasoning: seasoningOps.add,
    removeSeasoning: seasoningOps.remove,
    updateSeasoning: seasoningOps.update,
    toggleExcludeSeasoning: seasoningOps.toggleExclude,
    moveSeasoning,
    setLotteryMode,
    setLotteryCount,
    toggleSound,
    recordDraw,
    toggleFavorite,
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
