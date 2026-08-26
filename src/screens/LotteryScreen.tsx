import { useState } from 'react'
import { drawSet } from '../domain/lottery'
import type { LotteryResult } from '../domain/lottery'
import type { UseAppState } from '../hooks/useAppState'

interface Props {
  app: UseAppState
}

export function LotteryScreen({ app }: Props) {
  const [results, setResults] = useState<LotteryResult[] | null>(null)
  const { fillings, seasonings } = app.state

  const spin = () => {
    const r = drawSet(fillings, seasonings)
    if (r === null) return
    setResults(r)
    app.recordDraw(r)
  }

  return (
    <div className="lottery-screen">
      <p className="hint">具×味付け 5組をまとめて抽選します</p>
      {fillings.length === 0 && (
        <p className="notice" role="alert">
          具を追加してください(リストタブから追加できます)
        </p>
      )}
      <button
        type="button"
        className="spin-button"
        onClick={spin}
        disabled={fillings.length === 0}
      >
        まわす
      </button>
      {results && (
        <ol className="results" aria-label="抽選結果">
          {results.map((r, i) => (
            <li key={i} className="result-item">
              <span className="result-index">{i + 1}</span>
              <span className="result-filling">{r.filling}</span>
              <span className="result-seasoning">
                {r.seasoning === '' ? '—' : r.seasoning}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
