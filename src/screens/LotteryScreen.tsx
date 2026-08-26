import { useState } from 'react'
import { drawSet } from '../domain/lottery'
import { drawSetTwoFillings } from '../domain/lottery2'
import type { LotteryResult } from '../domain/lottery'
import type { LotteryResult2 } from '../domain/lottery2'
import type { UseAppState } from '../hooks/useAppState'

interface Props {
  app: UseAppState
}

type Mode = 'one' | 'two'

export function LotteryScreen({ app }: Props) {
  const [mode, setMode] = useState<Mode>('one')
  const [results, setResults] = useState<LotteryResult[] | LotteryResult2[] | null>(null)
  // 再抽選時もアニメーションを再生し直すため、抽選ごとにキーを変える
  const [spinCount, setSpinCount] = useState(0)
  const { fillings, seasonings } = app.state

  const needsTwo = mode === 'two'
  const canSpin = needsTwo ? fillings.length >= 2 : fillings.length > 0

  const spin = () => {
    if (!canSpin) return
    if (needsTwo) {
      const r = drawSetTwoFillings(fillings, seasonings)
      if (r === null) return
      setResults(r)
      setSpinCount((c) => c + 1)
      app.recordDraw(r as unknown as LotteryResult[])
    } else {
      const r = drawSet(fillings, seasonings)
      if (r === null) return
      setResults(r)
      setSpinCount((c) => c + 1)
      app.recordDraw(r)
    }
  }

  const isTwo = (r: LotteryResult | LotteryResult2): r is LotteryResult2 =>
    'filling2' in r

  return (
    <div className="lottery-screen">
      <fieldset className="mode-toggle">
        <legend className="visually-hidden">具の数</legend>
        <label>
          <input
            type="radio"
            name="filling-mode"
            value="one"
            checked={mode === 'one'}
            onChange={() => setMode('one')}
          />
          <span>具1つ</span>
        </label>
        <label>
          <input
            type="radio"
            name="filling-mode"
            value="two"
            checked={mode === 'two'}
            onChange={() => setMode('two')}
          />
          <span>具2つ</span>
        </label>
      </fieldset>

      {!canSpin && fillings.length > 0 && (
        <p className="notice" role="alert">
          具を2つ以上登録してください(リストタブから追加できます)
        </p>
      )}
      {fillings.length === 0 && (
        <p className="notice" role="alert">
          具を追加してください(リストタブから追加できます)
        </p>
      )}
      <button
        type="button"
        className="spin-button"
        onClick={spin}
        disabled={!canSpin}
      >
        おにる！
      </button>
      {results && (
        <ol className="results" aria-label="抽選結果" key={spinCount}>
          {results.map((r, i) => (
            <li key={i} className="result-item">
              <span className="result-index">{i + 1}</span>
              <span className="result-filling">
                {isTwo(r) ? `${r.filling} ×${r.filling2}` : r.filling}
              </span>
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
