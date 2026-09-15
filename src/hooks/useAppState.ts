import { useEffect, useReducer, useCallback, useMemo, useRef } from 'react'
import { loadState, saveState } from '../storage/appStorage'
import {
  MAX_HISTORY,
  MAX_LIST_LEN,
  newHistoryId,
  pruneHistory,
  DEFAULT_CATEGORY,
  type AppState,
  type LotteryMode,
  type Category,
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
  | { type: 'SET_CATEGORY'; name: string; category: Category }
  | { type: 'ADD_TAG'; id: string; label: string }
  | { type: 'RENAME_TAG'; id: string; label: string }
  | { type: 'REMOVE_TAG'; id: string }
  | { type: 'MOVE_TAG'; from: number; to: number }
  | { type: 'SET_MODE'; mode: LotteryMode }
  | { type: 'SET_COUNT'; count: number }
  | { type: 'SET_UNIQUE_TAGS'; enabled: boolean }
  | { type: 'SET_FIXED_FILLING'; filling: string | undefined }
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
      const nextSettings =
        action.kind === 'fillings' && state.settings.fixedFilling === action.name
          ? { ...state.settings, fixedFilling: undefined }
          : state.settings
      return {
        ...state,
        [action.kind]: list.filter((x) => x !== action.name),
        [exKey]: excluded,
        settings: nextSettings,
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
      const nextSettings =
        action.kind === 'fillings' && state.settings.fixedFilling === action.name
          ? { ...state.settings, fixedFilling: action.newName }
          : state.settings
      return {
        ...state,
        [action.kind]: list.map((x) => (x === action.name ? action.newName : x)),
        [exKey]: excluded,
        settings: nextSettings,
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
    case 'SET_CATEGORY': {
      if (!state.fillings.includes(action.name)) return state
      return {
        ...state,
        fillingCategories: {
          ...state.fillingCategories,
          [action.name]: action.category,
        },
      }
    }
    case 'ADD_TAG': {
      const label = action.label.trim()
      if (label.length === 0 || label.length > MAX_LIST_LEN) return state
      if (state.tags.some((t) => t.id === action.id || t.label === label))
        return state
      return { ...state, tags: [...state.tags, { id: action.id, label }] }
    }
    case 'RENAME_TAG': {
      const label = action.label.trim()
      if (label.length === 0 || label.length > MAX_LIST_LEN) return state
      // ラベル重複(自分以外)は不可
      if (state.tags.some((t) => t.id !== action.id && t.label === label))
        return state
      if (!state.tags.some((t) => t.id === action.id)) return state
      return {
        ...state,
        tags: state.tags.map((t) =>
          t.id === action.id ? { ...t, label } : t,
        ),
      }
    }
    case 'MOVE_TAG': {
      const { from, to } = action
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.tags.length ||
        to >= state.tags.length
      )
        return state
      const tags = [...state.tags]
      const [moved] = tags.splice(from, 1)
      tags.splice(to, 0, moved)
      return { ...state, tags }
    }
    case 'REMOVE_TAG': {
      // フォールバック先(other)は削除不可・最後の1つは削除不可
      if (action.id === DEFAULT_CATEGORY) return state
      if (!state.tags.some((t) => t.id === action.id)) return state
      if (state.tags.length <= 1) return state
      const tags = state.tags.filter((t) => t.id !== action.id)
      // 削除タグを参照していた具は other へ
      const fillingCategories: Record<string, Category> = {}
      for (const [name, cat] of Object.entries(state.fillingCategories)) {
        fillingCategories[name] = cat === action.id ? DEFAULT_CATEGORY : cat
      }
      return { ...state, tags, fillingCategories }
    }
    case 'SET_MODE':
      return { ...state, settings: { ...state.settings, mode: action.mode } }
    case 'SET_COUNT':
      return {
        ...state,
        settings: { ...state.settings, count: Math.min(10, Math.max(1, action.count)) },
      }
    case 'SET_UNIQUE_TAGS':
      return { ...state, settings: { ...state.settings, uniqueTags: action.enabled } }
    case 'SET_FIXED_FILLING':
      return { ...state, settings: { ...state.settings, fixedFilling: action.filling || undefined } }
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
      // お気に入り(★付き)は削除対象外
      return { ...state, history: state.history.filter((h) => h.fav) }
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
  setUniqueTags: (enabled: boolean) => void
  setFixedFilling: (filling: string | undefined) => void
  toggleSound: () => void
  setFillingCategory: (name: string, category: Category) => void
  addTag: (label: string) => boolean
  renameTag: (id: string, label: string) => boolean
  removeTag: (id: string) => boolean
  moveTag: (from: number, to: number) => void
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
  const setUniqueTags = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_UNIQUE_TAGS', enabled })
  }, [])
  const setFixedFilling = useCallback((filling: string | undefined) => {
    dispatch({ type: 'SET_FIXED_FILLING', filling })
  }, [])
  const toggleSound = useCallback(() => {
    dispatch({ type: 'TOGGLE_SOUND' })
  }, [])
  const setFillingCategory = useCallback((name: string, category: Category) => {
    dispatch({ type: 'SET_CATEGORY', name, category })
  }, [])
  // タグ操作(idは簡易生成)
  const tagIdRef = useRef(0)
  const addTag = useCallback(
    (label: string) => {
      const id = `tag-${Date.now()}-${tagIdRef.current++}`
      const ok =
        label.trim().length > 0 &&
        label.trim().length <= MAX_LIST_LEN
      dispatch({ type: 'ADD_TAG', id, label })
      return ok
    },
    [],
  )
  const renameTag = useCallback((id: string, label: string) => {
    const ok =
      label.trim().length > 0 && label.trim().length <= MAX_LIST_LEN
    dispatch({ type: 'RENAME_TAG', id, label })
    return ok
  }, [])
  const removeTag = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TAG', id })
    return true
  }, [])
  const moveTag = useCallback((from: number, to: number) => {
    dispatch({ type: 'MOVE_TAG', from, to })
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
    setUniqueTags,
    setFixedFilling,
    toggleSound,
    setFillingCategory,
    addTag,
    renameTag,
    removeTag,
    moveTag,
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
