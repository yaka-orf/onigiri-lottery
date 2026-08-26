import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ManageScreen } from './ManageScreen'
import type { UseAppState } from '../hooks/useAppState'

const mk = (overrides: Partial<UseAppState> = {}): UseAppState => ({
  state: {
    fillings: ['鮭', '梅'],
    seasonings: ['塩', '醤油'],
    excludedFillings: [],
    excludedSeasonings: [],
    settings: { mode: 'one', count: 5 },
    soundEnabled: true,
    fillingCategories: { 鮭: 'fish', 梅: 'classic' },
    history: [],
  },
  effectiveFillings: ['鮭', '梅'],
  effectiveSeasonings: ['塩', '醤油'],
  storageAvailable: true,
  addFilling: vi.fn(() => true),
  removeFilling: vi.fn(() => true),
  updateFilling: vi.fn(() => true),
  toggleExcludeFilling: vi.fn(() => true),
  moveFilling: vi.fn(),
  addSeasoning: vi.fn(() => true),
  removeSeasoning: vi.fn(() => true),
  updateSeasoning: vi.fn(() => true),
  toggleExcludeSeasoning: vi.fn(() => true),
  moveSeasoning: vi.fn(),
  setLotteryMode: vi.fn(),
  setLotteryCount: vi.fn(),
  toggleSound: vi.fn(),
  setFillingCategory: vi.fn(),
  recordDraw: vi.fn(),
  toggleFavorite: vi.fn(),
  clearHistory: vi.fn(),
  ...overrides,
} as unknown as UseAppState)

describe('ManageScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('具リストが表示される', () => {
    render(<ManageScreen app={mk()} />)
    expect(screen.getByText('鮭')).toBeInTheDocument()
    expect(screen.getByText('梅')).toBeInTheDocument()
  })

  it('具/味付けセグメント切替でリストが変わる', () => {
    render(<ManageScreen app={mk()} />)
    fireEvent.click(screen.getAllByRole('tab', { name: '味付け' })[0])
    expect(screen.getByText('塩')).toBeInTheDocument()
    expect(screen.queryByText('鮭')).not.toBeInTheDocument()
  })

  describe('追加', () => {
    it('入力して追加ボタンで addFilling が呼ばれる', () => {
      const app = mk()
      render(<ManageScreen app={app} />)
      fireEvent.change(screen.getByPlaceholderText(/追加/), {
        target: { value: '味しらべ' },
      })
      fireEvent.click(screen.getByRole('button', { name: '追加' }))
      expect(app.addFilling).toHaveBeenCalledWith('味しらべ')
    })
    it('空入力では呼ばれない', () => {
      const app = mk()
      render(<ManageScreen app={app} />)
      fireEvent.click(screen.getByRole('button', { name: '追加' }))
      expect(app.addFilling).not.toHaveBeenCalled()
    })
  })

  describe('削除', () => {
    it('確認ダイアログで OK 後に削除呼び出し', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const app = mk()
      render(<ManageScreen app={app} />)
      fireEvent.click(screen.getAllByRole('button', { name: '削除' })[0])
      expect(confirmSpy).toHaveBeenCalled()
      expect(app.removeFilling).toHaveBeenCalledWith('鮭')
    })
    it('キャンセルでは削除しない', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const app = mk()
      render(<ManageScreen app={app} />)
      fireEvent.click(screen.getAllByRole('button', { name: '削除' })[0])
      expect(app.removeFilling).not.toHaveBeenCalled()
    })
  })

  describe('編集', () => {
    it('編集ボタン→入力→保存で updateFilling 呼び出し', () => {
      const app = mk()
      render(<ManageScreen app={app} />)
      fireEvent.click(screen.getAllByRole('button', { name: '編集' })[0])
      const input = screen.getByDisplayValue('鮭')
      fireEvent.change(input, { target: { value: '味しらべ' } })
      fireEvent.click(screen.getByRole('button', { name: '保存' }))
      expect(app.updateFilling).toHaveBeenCalledWith('鮭', '味しらべ')
    })
  })

  describe('並べ替え(ドラッグ&ドロップ)', () => {
    it('ドラッグハンドルが各行に表示される', () => {
      render(<ManageScreen app={mk()} />)
      expect(screen.getByRole('button', { name: '鮭を並べ替え' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '梅を並べ替え' })).toBeInTheDocument()
    })

    it('drop で moveFilling(from, to) が呼ばれる', () => {
      const app = mk()
      render(<ManageScreen app={app} />)
      const rows = screen.getAllByRole('listitem')
      // 0行目をdrag開始 → 1行目にdrop
      fireEvent.dragStart(rows[0], { dataTransfer: { setData: vi.fn(), effectAllowed: 'move' } })
      fireEvent.dragOver(rows[1], { dataTransfer: { dropEffect: 'move' } })
      fireEvent.drop(rows[1], { dataTransfer: { getData: () => '0' } })
      expect(app.moveFilling).toHaveBeenCalledWith(0, 1)
    })

    it('同一行への drop では move しない', () => {
      const app = mk()
      render(<ManageScreen app={app} />)
      const rows = screen.getAllByRole('listitem')
      fireEvent.dragStart(rows[0], { dataTransfer: { setData: vi.fn(), effectAllowed: 'move' } })
      fireEvent.drop(rows[0], { dataTransfer: { getData: () => '0' } })
      expect(app.moveFilling).not.toHaveBeenCalled()
    })
  })
})
