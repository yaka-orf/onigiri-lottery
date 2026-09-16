import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppState } from './useAppState'
import { STORAGE_KEY } from '../storage/appStorage'
import type { LotteryResult } from '../domain/lottery'

const pair = (f: string, s: string): LotteryResult => ({ filling: f, seasoning: s })

describe('useAppState', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('初回は初期値(デフォルト8具4味付け)', () => {
    const { result } = renderHook(() => useAppState())
    expect(result.current.state.fillings).toHaveLength(8)
    expect(result.current.state.seasonings).toHaveLength(4)
    expect(result.current.state.history).toEqual([])
  })

  it('localStorage に事前データがある場合は読み込む', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fillings: ['鮭', '梅'],
        seasonings: ['塩'],
        history: [],
      }),
    )
    const { result } = renderHook(() => useAppState())
    expect(result.current.state.fillings).toEqual(['鮭', '梅'])
  })

  describe('具リスト操作', () => {
    it('addFilling: 追加して保存される', () => {
      const { result } = renderHook(() => useAppState())
      act(() => {
        result.current.addFilling('味しらべ')
      })
      expect(result.current.state.fillings).toContain('味しらべ')
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved.fillings).toContain('味しらべ')
    })
    it('addFilling: 空・重複・21文字は拒否(false)', () => {
      const { result } = renderHook(() => useAppState())
      expect(result.current.addFilling('')).toBe(false)
      expect(result.current.addFilling('鮭')).toBe(false) // 重複
      expect(result.current.addFilling('あ'.repeat(21))).toBe(false)
      expect(result.current.state.fillings).toHaveLength(8)
    })
    it('removeFilling: 削除できる', () => {
      const { result } = renderHook(() => useAppState())
      act(() => {
        expect(result.current.removeFilling('鮭')).toBe(true)
      })
      act(() => {
        expect(result.current.removeFilling('梅')).toBe(true)
      })
      expect(result.current.state.fillings).toHaveLength(6)
    })
    it('removeFilling: 1件になったら削除不可', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ fillings: ['鮭'], seasonings: ['塩'], history: [] }),
      )
      const { result } = renderHook(() => useAppState())
      expect(result.current.removeFilling('鮭')).toBe(false)
      expect(result.current.state.fillings).toEqual(['鮭'])
    })
    it('updateFilling: 改名時にカテゴリ(タグ)も引継ぎ', () => {
      const { result } = renderHook(() => useAppState())
      act(() => {
        expect(result.current.updateFilling('鮭', '味しらべ')).toBe(true)
      })
      expect(result.current.state.fillingCategories['味しらべ']).toBe('fish')
      expect(result.current.state.fillingCategories['鮭']).toBeUndefined()
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved.fillingCategories['味しらべ']).toBe('fish')
    })
    it('updateFilling: 正常更新・重複は拒否', () => {
      const { result } = renderHook(() => useAppState())
      act(() => {
        expect(result.current.updateFilling('鮭', '味しらべ')).toBe(true)
      })
      expect(result.current.state.fillings).toContain('味しらべ')
      act(() => {
        expect(result.current.updateFilling('味しらべ', '梅')).toBe(false) // 重複
      })
      expect(result.current.state.fillings).toContain('味しらべ')
    })
  })

  describe('味付けリスト操作', () => {
    it('addSeasoning / removeSeasoning / updateSeasoning', () => {
      const { result } = renderHook(() => useAppState())
      act(() => {
        expect(result.current.addSeasoning('ポン酢')).toBe(true)
      })
      expect(result.current.state.seasonings).toContain('ポン酢')
      act(() => {
        expect(result.current.removeSeasoning('ポン酢')).toBe(true)
      })
      expect(result.current.state.seasonings).not.toContain('ポン酢')
      act(() => {
        expect(result.current.updateSeasoning('塩', 'ポン酢')).toBe(true)
      })
    })
  })

  describe('recordDraw', () => {
    it('5組のセットを history に追加・保存される', () => {
      const { result } = renderHook(() => useAppState())
      const results = [
        pair('鮭', '塩'),
        pair('梅', '醤油'),
        pair('おかか', '塩'),
        pair('昆布', 'なし'),
        pair('ツナマヨ', 'ごま油'),
      ]
      act(() => {
        result.current.recordDraw(results)
      })
      expect(result.current.state.history).toHaveLength(1)
      expect(result.current.state.history[0].results).toEqual(results)
      expect(typeof result.current.state.history[0].at).toBe('number')
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved.history).toHaveLength(1)
    })
    it('6セット目で最古が削除され5セット維持', () => {
      const { result } = renderHook(() => useAppState())
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.recordDraw([pair(`具${i}`, '塩')])
        })
      }
      expect(result.current.state.history).toHaveLength(5)
      expect(result.current.state.history[0].results[0].filling).toBe('具1')
      expect(result.current.state.history[4].results[0].filling).toBe('具5')
    })
  })

  it('clearHistory: 履歴を空にする', () => {
    const { result } = renderHook(() => useAppState())
    act(() => {
      result.current.recordDraw([pair('鮭', '塩')])
    })
    act(() => {
      result.current.clearHistory()
    })
    expect(result.current.state.history).toEqual([])
  })
})
