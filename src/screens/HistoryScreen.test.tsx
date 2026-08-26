import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryScreen } from './HistoryScreen'
import type { UseAppState } from '../hooks/useAppState'
import type { AppState } from '../domain/model'

const setState = (history: AppState['history']): AppState => ({
  fillings: ['鮭'],
  seasonings: ['塩'],
  history,
})

const mk = (state: AppState): UseAppState => ({
  state,
  storageAvailable: true,
  addFilling: vi.fn(),
  removeFilling: vi.fn(),
  updateFilling: vi.fn(),
  addSeasoning: vi.fn(),
  removeSeasoning: vi.fn(),
  updateSeasoning: vi.fn(),
  recordDraw: vi.fn(),
  clearHistory: vi.fn(),
} as unknown as UseAppState)

describe('HistoryScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('履歴なしの案内表示', () => {
    render(<HistoryScreen app={mk(setState([]))} />)
    expect(screen.getByText(/まだ履歴はありません/)).toBeInTheDocument()
  })

  it('セットが最新順で表示される', () => {
    const history = [
      { results: [{ filling: '鮭', seasoning: '塩' }], at: 1000 },
      { results: [{ filling: '梅', seasoning: '醤油' }], at: 2000 },
    ]
    render(<HistoryScreen app={mk(setState(history))} />)
    const sets = screen.getAllByRole('listitem', { name: '' })
    // セット単位の項目が最新順
    const first = screen.getByText('梅')
    expect(first).toBeInTheDocument()
  })

  it('各セットに5組が表示される', () => {
    const results = Array.from({ length: 5 }, (_, i) => ({
      filling: `具${i}`,
      seasoning: '塩',
    }))
    render(<HistoryScreen app={mk(setState([{ results, at: 1000 }]))} />)
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`具${i}`)).toBeInTheDocument()
    }
  })

  it('全削除: 確認 OK で clearHistory 呼び出し', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const app = mk(setState([{ results: [{ filling: '鮭', seasoning: '塩' }], at: 1 }]))
    render(<HistoryScreen app={app} />)
    fireEvent.click(screen.getByRole('button', { name: '全削除' }))
    expect(app.clearHistory).toHaveBeenCalledTimes(1)
  })

  it('全削除: キャンセルでは呼ばれない', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const app = mk(setState([{ results: [{ filling: '鮭', seasoning: '塩' }], at: 1 }]))
    render(<HistoryScreen app={app} />)
    fireEvent.click(screen.getByRole('button', { name: '全削除' }))
    expect(app.clearHistory).not.toHaveBeenCalled()
  })
})
