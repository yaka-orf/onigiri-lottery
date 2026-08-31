import { useState } from 'react'
import type { LotteryResult } from '../domain/lottery'
import type { LotteryResult2 } from '../domain/lottery2'
import type { UseAppState } from '../hooks/useAppState'
import { shareOrCopy } from '../lib/share'
import { playSpin } from '../lib/sound'
import { drawSetUnique } from '../domain/lottery3'
import {
  DEFAULT_CATEGORY,
} from '../domain/model'

interface Props {
  app: UseAppState
}

const MIN_COUNT = 1
const MAX_COUNT = 10

type CreateMode = 'random' | 'manual'

/** 手動選択の1行分 */
interface ManualRow {
  filling: string
  filling2: string // 2具モードのみ
  seasoning: string
}

export function LotteryScreen({ app }: Props) {
  // モード・個数は AppState.settings から(永続化される)
  const mode = app.state.settings.mode
  const count = app.state.settings.count
  const [results, setResults] = useState<LotteryResult[] | LotteryResult2[] | null>(null)
  // 再抽選時もアニメーションを再生し直すため、抽選ごとにキーを変える
  const [spinCount, setSpinCount] = useState(0)
  // 共有ボタンのフィードバック表示
  const [shareState, setShareState] = useState<'idle' | 'done'>('idle')
  // 保存完了フィードバック
  const [savedState, setSavedState] = useState<'idle' | 'done'>('idle')

  // ランダム/自分 モード
  const [createMode, setCreateMode] = useState<CreateMode>('random')

  const fillings = app.effectiveFillings
  const seasonings = app.effectiveSeasonings
  const soundEnabled = app.state.soundEnabled
  const categories = app.state.fillingCategories

  // タグ絞り込み(複数選択、空='all'相当)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }
  const filteredFillings =
    selectedTags.length === 0
      ? fillings
      : fillings.filter((f) => {
          const cat = categories[f] ?? DEFAULT_CATEGORY
          return selectedTags.includes(cat)
        })

  const needsTwo = mode === 'two'
  const canSpin = needsTwo ? filteredFillings.length >= 2 : filteredFillings.length > 0

  // --- 手動モード ---
  const [manualRows, setManualRows] = useState<ManualRow[]>([])
  const [manualError, setManualError] = useState('')

  // 手動行を count に同期(不足は先頭要素で補完、超過は切り詰め)
  const syncManualRows = (): ManualRow[] => {
    const rows = [...manualRows]
    const firstFilling = fillings[0] ?? ''
    const firstSeasoning = seasonings[0] ?? ''
    while (rows.length < count) {
      rows.push({ filling: firstFilling, filling2: '', seasoning: firstSeasoning })
    }
    return rows.slice(0, count)
  }

  const updateManualRow = (i: number, patch: Partial<ManualRow>) => {
    setManualRows(() => {
      const next = syncManualRows()
      next[i] = { ...next[i], ...patch }
      return next
    })
    setManualError('')
  }

  // 手動モードのライブ結果(バリデーションOKの行のみ表示対象、全体は常に表示)
  const manualResults: LotteryResult[] | LotteryResult2[] = needsTwo
    ? syncManualRows().map((row) => ({
        filling: row.filling || '—',
        filling2: row.filling2 || '—',
        seasoning: row.seasoning || '—',
      }))
    : syncManualRows().map((row) => ({
        filling: row.filling || '—',
        seasoning: row.seasoning || '—',
      }))

  // 手動結果のバリデーション(保存可能か)
  const validateManual = (): string => {
    for (const row of syncManualRows()) {
      if (!row.filling || !row.seasoning) {
        return '具と味付けをすべて選択してください'
      }
      if (needsTwo && row.filling2 === '') {
        return '具を2つとも選択してください'
      }
      if (needsTwo && row.filling === row.filling2) {
        return '同じ具を2つ選ぶことはできません'
      }
    }
    return ''
  }

  const spin = () => {
    if (!canSpin) return
    if (soundEnabled) playSpin()
    const r = drawSetUnique(
      filteredFillings,
      seasonings,
      count,
      {
        uniqueTags: app.state.settings.uniqueTags,
        twoFillings: needsTwo,
      },
      categories,
    )
    if (r === null) return
    setResults(r as LotteryResult[])
    setSpinCount((c) => c + 1)
    app.recordDraw(r as unknown as LotteryResult[])
  }

  // おにる！可能か(制約を満たす組み合わせがあるか)
  const perRow = needsTwo ? 2 : 1
  const needed = count * perRow
  // 2具モードのペア数: C(fillings, 2)
  const n = filteredFillings.length
  const pairCount = (n * (n - 1)) / 2
  // uniqueTags ON 時: 同タグペアを除いたペア数
  let okPairCount = pairCount
  if (needsTwo && app.state.settings.uniqueTags) {
    const byTag: Record<string, number> = {}
    for (const f of filteredFillings) {
      const c = categories[f] ?? DEFAULT_CATEGORY
      byTag[c] = (byTag[c] ?? 0) + 1
    }
    const sameTagPairs = Object.values(byTag).reduce(
      (sum, cnt) => sum + (cnt * (cnt - 1)) / 2,
      0,
    )
    okPairCount = pairCount - sameTagPairs
  }
  const canDrawUnique =
    filteredFillings.length >= (needsTwo ? 2 : count) &&
    (!needsTwo || okPairCount >= count)

  // 手動選択を履歴に保存
  const saveManual = () => {
    const error = validateManual()
    if (error) {
      setManualError(error)
      return
    }
    const rows = syncManualRows()
    const r: LotteryResult[] | LotteryResult2[] = needsTwo
      ? rows.map((row) => ({
          filling: row.filling,
          filling2: row.filling2,
          seasoning: row.seasoning,
        }))
      : rows.map((row) => ({ filling: row.filling, seasoning: row.seasoning }))
    if (soundEnabled) playSpin()
    app.recordDraw(r as LotteryResult[])
    setSavedState('done')
    window.setTimeout(() => setSavedState('idle'), 1500)
  }

  // ランダム結果を手動モードへ引き継いで編集
  const editResults = () => {
    if (!results) return
    const rows: ManualRow[] = results.map((r) => ({
      filling: r.filling,
      filling2: 'filling2' in r ? r.filling2 : '',
      seasoning: r.seasoning,
    }))
    setManualRows(rows)
    setCreateMode('manual')
    setManualError('')
    setResults(null)
  }

  const handleShare = async () => {
    const target = createMode === 'manual' ? manualResults : results
    if (!target) return
    const outcome = await shareOrCopy(target)
    if (outcome !== 'failed') {
      setShareState('done')
      window.setTimeout(() => setShareState('idle'), 1500)
    }
  }

  const isTwo = (r: LotteryResult | LotteryResult2): r is LotteryResult2 =>
    'filling2' in r

  const selectOptions = (options: string[], value: string) => (
    <>
      {!options.includes(value) && value !== '' && value !== '—' && (
        <option value={value}>{value}</option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </>
  )

  return (
    <div className="lottery-screen">
      <div className="select-toggles">
        <label className="select-toggle">
          <span className="select-toggle-label">作成方法</span>
          <select
            className="select-toggle-select"
            value={createMode}
            onChange={(e) => {
              setCreateMode(e.target.value as CreateMode)
              setManualError('')
            }}
          >
            <option value="random">ランダム</option>
            <option value="manual">自分</option>
          </select>
        </label>
        <label className="select-toggle">
          <span className="select-toggle-label">具の数</span>
          <select
            className="select-toggle-select"
            value={mode}
            onChange={(e) => app.setLotteryMode(e.target.value as 'one' | 'two')}
          >
            <option value="one">具1つ</option>
            <option value="two">具2つ</option>
          </select>
        </label>
      </div>

      {createMode === 'random' && (
        <div className="category-chips" role="group" aria-label="タグ絞り込み">
          <button
            type="button"
            className={`chip${selectedTags.length === 0 ? ' active' : ''}`}
            onClick={() => setSelectedTags([])}
            aria-pressed={selectedTags.length === 0}
          >
            全部
          </button>
          {app.state.tags.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip${selectedTags.includes(t.id) ? ' active' : ''}`}
              onClick={() => toggleTag(t.id)}
              aria-pressed={selectedTags.includes(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="count-stepper" role="group" aria-label="作成個数">
        <button
          type="button"
          className="step-btn"
          onClick={() => app.setLotteryCount(Math.max(MIN_COUNT, count - 1))}
          disabled={count <= MIN_COUNT}
          aria-label="個数を減らす"
        >
          −
        </button>
        <span className="count-value">
          <span className="count-num">{count}</span>
          <span className="count-unit">個</span>
        </span>
        <button
          type="button"
          className="step-btn"
          onClick={() => app.setLotteryCount(Math.min(MAX_COUNT, count + 1))}
          disabled={count >= MAX_COUNT}
          aria-label="個数を増やす"
        >
          ＋
        </button>
      </div>

      {createMode === 'random' ? (
        <>
          {!canSpin && filteredFillings.length === 0 && (
            <p className="notice" role="alert">
              抽選できる具がありません(管理タブで除外を解除するか追加してください)
            </p>
          )}
          {!canSpin && filteredFillings.length < 2 && needsTwo && filteredFillings.length > 0 && (
            <p className="notice" role="alert">
              具2つモードには具を2つ以上有効にしてください
            </p>
          )}
          {!canDrawUnique && canSpin && (
            <p className="notice" role="alert">
              {needsTwo && app.state.settings.uniqueTags
                ? `組み合わせが足りません(選択できる具のペアが${count}通り未満です)`
                : `具が足りません(重複なし抽選には${needed}個以上の具が必要です)`}
            </p>
          )}
          <button
            type="button"
            className="spin-button"
            onClick={spin}
            disabled={!canSpin || !canDrawUnique}
          >
            おにる！
          </button>
        </>
      ) : (
        <>
          <ul className="manual-rows" aria-label="手動選択">
            {syncManualRows().map((row, i) => (
              <li key={i} className="manual-row">
                <span className="result-index">{i + 1}</span>
                <select
                  className="manual-select"
                  value={row.filling}
                  onChange={(e) => updateManualRow(i, { filling: e.target.value })}
                  aria-label={`${i + 1}個目の具`}
                >
                  <option value="">選択してください</option>
                  {selectOptions(fillings, row.filling)}
                </select>
                {needsTwo && (
                  <>
                    <span className="manual-x">×</span>
                    <select
                      className="manual-select"
                      value={row.filling2}
                      onChange={(e) => updateManualRow(i, { filling2: e.target.value })}
                      aria-label={`${i + 1}個目の具2`}
                    >
                      <option value="">選択してください</option>
                      {selectOptions(fillings, row.filling2)}
                    </select>
                  </>
                )}
                <span className="manual-x">×</span>
                <select
                  className="manual-select"
                  value={row.seasoning}
                  onChange={(e) => updateManualRow(i, { seasoning: e.target.value })}
                  aria-label={`${i + 1}個目の味付け`}
                >
                  <option value="">選択してください</option>
                  {selectOptions(seasonings, row.seasoning)}
                </select>
              </li>
            ))}
          </ul>
          {manualError && (
            <p className="notice" role="alert">
              {manualError}
            </p>
          )}
          {/* 入力欄の直下に保存・コピー */}
          <div className="results-actions manual-actions">
            <button
              type="button"
              className="share-button"
              onClick={saveManual}
              disabled={fillings.length === 0}
            >
              {savedState === 'done' ? '保存しました' : '保存'}
            </button>
            <button
              type="button"
              className="share-button"
              onClick={handleShare}
            >
              {shareState === 'done' ? 'コピーしました' : '結果をコピー'}
            </button>
          </div>
        </>
      )}

      {results && createMode === 'random' && (
        <div className="results-wrap">
          <ol className="results" aria-label="作成結果" key={spinCount}>
            {results.map((r, i) => (
              <li
                key={i}
                className="result-item"
                style={{ animationDelay: `${0.03 + i * 0.06}s` }}
              >
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
          <div className="results-actions">
            <button
              type="button"
              className="share-button"
              onClick={handleShare}
            >
              {shareState === 'done' ? 'コピーしました' : '結果をコピー'}
            </button>
            <button
              type="button"
              className="share-button edit-button"
              onClick={editResults}
            >
              編集
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
