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
    expect(screen.getByRole('button', { name: 'おにる！' })).toBeInTheDocument()
    // 管理タブへ
    fireEvent.click(screen.getByRole('tab', { name: '管理' }))
    expect(screen.getByPlaceholderText(/新しい具を追加/)).toBeInTheDocument()
    // 履歴へ
    fireEvent.click(screen.getByRole('tab', { name: '履歴' }))
    expect(screen.getByText(/まだ履歴はありません/)).toBeInTheDocument()
  })

  it('統合フロー: まわす→履歴に反映', () => {
    const { unmount } = render(<App />)
    unmount()
    // 具1件・味付け1件に固定して抽選結果を確定させる
    localStorage.setItem(
      'onigiri-lottery',
      JSON.stringify({
        fillings: ['鮭'],
        seasonings: ['塩'],
        history: [],
      }),
    )
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'おにる！' }))
    fireEvent.click(screen.getByRole('tab', { name: '履歴' }))
    expect(screen.queryByText(/まだ履歴はありません/)).not.toBeInTheDocument()
    // 5組すべて鮭×塩
    expect(screen.getAllByText('鮭')).toHaveLength(5)
  })

  it('統合フロー: 管理で具を追加してlocalStorageに保存される', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: '管理' }))
    fireEvent.change(screen.getByPlaceholderText(/新しい具を追加/), {
      target: { value: '味しらべ' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: '追加' })[1])
    const saved = JSON.parse(localStorage.getItem('onigiri-lottery')!)
    expect(saved.fillings).toContain('味しらべ')
  })
})
