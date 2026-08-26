import type { UseAppState } from '../hooks/useAppState'

interface Props {
  app: UseAppState
}

const fmt = (at: number): string => {
  const d = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function HistoryScreen({ app }: Props) {
  const { history } = app.state
  // 最新順
  const sorted = [...history].reverse()

  const clearAll = () => {
    if (!window.confirm('お気に入りを含む全履歴を削除しますか?')) return
    app.clearHistory()
  }

  return (
    <div className="history-screen">
      {history.length === 0 ? (
        <p className="notice">まだ履歴はありません。「おにる！」で抽選するとここに表示されます。</p>
      ) : (
        <>
          <div className="history-actions">
            <button type="button" className="danger" onClick={clearAll}>
              全削除
            </button>
          </div>
          <ul className="history-list">
            {sorted.map((set, i) => (
              <li key={set.id} className={`history-set${set.fav ? ' favored' : ''}`}>
                <div className="history-meta">
                  <button
                    type="button"
                    className={`fav-btn${set.fav ? ' on' : ''}`}
                    onClick={() => app.toggleFavorite(set.id)}
                    aria-pressed={set.fav}
                    aria-label={set.fav ? 'お気に入り解除' : 'お気に入り'}
                  >
                    {set.fav ? '★' : '☆'}
                  </button>
                  <span className="history-no">{sorted.length - i}</span>
                  <time>{fmt(set.at)}</time>
                </div>
                <ol className="history-results">
                  {set.results.map((r, j) => {
                    const pair = 'filling2' in r ? `${r.filling} ×${(r as { filling2: string }).filling2}` : r.filling
                    return (
                      <li key={j}>
                        {pair}
                        {r.seasoning !== '' && (
                          <span className="history-seasoning"> ×{r.seasoning}</span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
