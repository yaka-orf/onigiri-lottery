import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('3タブが表示され、切替で画面が変わる', () => {
    render(<App />)
    // 初期は抽選画面
    expect(screen.getByRole('button', { name: 'まわす' })).toBeInTheDocument()
    // リスト管理へ
    fireEvent.click(screen.getByRole('tab', { name: 'リスト' }))
    expect(screen.getByPlaceholderText(/新しい具を追加/)).toBeInTheDocument()
    // 履歴へ
    fireEvent.click(screen.getByRole('tab', { name: '履歴' }))
    expect(screen.getByText(/まだ履歴はありません/)).toBeInTheDocument()
  })

  it('統合フロー: まわす→履歴に反映', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'まわす' }))
    fireEvent.click(screen.getByRole('tab', { name: '履歴' }))
    expect(screen.queryByText(/まだ履歴はありません/)).not.toBeInTheDocument()
    // セット内に5組表示
    expect(screen.getAllByRole('list')).toHaveLength(2) // history-list + history-results
    expect(screen.getByText('鮭')).toBeInTheDocument()
  })

  it('統合フロー: リストで具を追加してlocalStorageに保存される', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'リスト' }))
    fireEvent.change(screen.getByPlaceholderText(/新しい具を追加/), {
      target: { value: '味しらべ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))
    const saved = JSON.parse(localStorage.getItem('onigiri-lottery')!)
    expect(saved.fillings).toContain('味しらべ')
  })
})
