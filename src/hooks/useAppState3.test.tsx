import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppState } from './useAppState'
import { STORAGE_KEY } from '../storage/appStorage'

describe('useAppState(並べ替え)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  const setup = (fillings: string[], seasonings: string[]) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fillings, seasonings, history: [] }),
    )
    return renderHook(() => useAppState())
  }

  it('moveFilling: 先頭→末尾', () => {
    const { result } = setup(['鮭', '梅', 'おかか'], ['塩'])
    act(() => {
      result.current.moveFilling(0, 2)
    })
    expect(result.current.state.fillings).toEqual(['梅', 'おかか', '鮭'])
  })

  it('moveFilling: 末尾→先頭', () => {
    const { result } = setup(['鮭', '梅', 'おかか'], ['塩'])
    act(() => {
      result.current.moveFilling(2, 0)
    })
    expect(result.current.state.fillings).toEqual(['おかか', '鮭', '梅'])
  })

  it('moveFilling: 同位置は no-op', () => {
    const { result } = setup(['鮭', '梅'], ['塩'])
    act(() => {
      result.current.moveFilling(1, 1)
    })
    expect(result.current.state.fillings).toEqual(['鮭', '梅'])
  })

  it('moveFilling: 範囲外は no-op', () => {
    const { result } = setup(['鮭', '梅'], ['塩'])
    act(() => {
      result.current.moveFilling(0, 5)
      result.current.moveFilling(-1, 0)
    })
    expect(result.current.state.fillings).toEqual(['鮭', '梅'])
  })

  it('moveSeasoning: 並べ替え(除外リストは影響を受けない)', () => {
    const { result } = setup(['鮭'], ['塩', '醤油', 'ごま油'])
    act(() => {
      result.current.toggleExcludeSeasoning('塩')
    })
    act(() => {
      result.current.moveSeasoning(0, 2)
    })
    expect(result.current.state.seasonings).toEqual(['醤油', 'ごま油', '塩'])
    // 除外は名前参照なので並べ替え後も維持される
    expect(result.current.state.excludedSeasonings).toEqual(['塩'])
    expect(result.current.effectiveSeasonings).toEqual(['醤油', 'ごま油'])
  })
})
