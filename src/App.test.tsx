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
    // 初期は作成画面
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
    // 具5件・味付け1件に固定(重複なし抽選のため5件必要)
    localStorage.setItem(
      'onigiri-lottery',
      JSON.stringify({
        fillings: ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ'],
        seasonings: ['塩'],
        settings: { mode: 'one', count: 5, uniqueTags: true, tagFilterEnabled: true },
        history: [],
      }),
    )
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'おにる！' }))
    fireEvent.click(screen.getByRole('tab', { name: '履歴' }))
    expect(screen.queryByText(/まだ履歴はありません/)).not.toBeInTheDocument()
    // 履歴に1セット記録され、5組の各具が表示される(history-results内を検索)
    const resultsList = document.querySelector('.history-results')
    expect(resultsList).not.toBeNull()
    const text = resultsList!.textContent ?? ''
    for (const f of ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ']) {
      expect(text).toContain(f)
    }
  })

  it('統合フロー: 管理で具を追加してlocalStorageに保存される', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: '管理' }))
    fireEvent.change(screen.getByPlaceholderText(/新しい具を追加/), {
      target: { value: '味しらべ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))
    const saved = JSON.parse(localStorage.getItem('onigiri-lottery')!)
    expect(saved.fillings).toContain('味しらべ')
  })
})
