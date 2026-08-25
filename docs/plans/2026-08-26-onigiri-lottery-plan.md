# おにぎり抽選シミュレータ 実装計画(新抽選仕様版)

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** 1回の抽選で 具×味付け 5組を生成するおにぎり抽選SPA(Vite+React+TS)を構築する

**Architecture:** ロジック層(純関数)・ストレージ層・UIを分離。3画面は下部タブで切替、状態管理ライブラリなし。localStorage 永続化は単一キー・スキーマ検証付き。

**Tech Stack:** Vite, React 18, TypeScript, Vitest, @testing-library/react, jsdom

**設計書:** `docs/plans/2026-08-26-onigiri-lottery-design.md`

**パス規約:** ターミナルは `cd "D:/ドキュメント/DEV/onigiri-lottery"` で移動してから操作する(bashビルトイン)。nativeツールには `D:/...` 形式のパスを渡すこと。プロジェクトパスに日本語を含むため native ツールへの相対パス渡しは避ける。

---

## Task 0: プロジェクト雛形

**Files:**
- Create: `package.json`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `vite.config.ts`

**Step 1: scaffold** — 一時ディレクトリで scaffold → コピー(docs/ と .git/ は保持)
```bash
cd "D:/ドキュメント/DEV/onigiri-lottery"
tmp=$(mktemp -d)
(cd "$tmp" && npm create vite@latest app -- --template react-ts >/dev/null 2>&1)
cp -r "$tmp/app/." .
rm -rf "$tmp"
npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: verify**
```bash
npm run build
```
Expected: ビルド成功

**Step 3: Commit** `chore: Vite+React+TS scaffold`

---

## Task 1: 抽選ロジック(純関数)

**Files:**
- Create: `src/domain/lottery.ts`
- Test: `src/domain/lottery.test.ts`

**Step 1: Write failing test**
```ts
import { describe, it, expect } from 'vitest'
import { drawOne, drawSet } from './lottery'

describe('drawOne', () => {
  it('リスト内のいずれかを返す', () => {
    const items = ['鮭', '梅', 'おかか']
    for (let i = 0; i < 100; i++) expect(items).toContain(drawOne(items))
  })
  it('空リストは null', () => expect(drawOne([])).toBeNull())
  it('単一要素は常にそれ', () => expect(drawOne(['明太子'])).toBe('明太子'))
  it('均等性: 10000試行で各要素>1000回', () => {
    const items = ['a', 'b', 'c', 'd']
    const counts = new Map(items.map(s => [s, 0]))
    for (let i = 0; i < 10000; i++) {
      const r = drawOne(items)!
      counts.set(r, counts.get(r)! + 1)
    }
    for (const c of counts.values()) expect(c).toBeGreaterThan(1000)
  })
})

describe('drawSet', () => {
  const F = ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ', '明太子', '焼きたらこ', 'たまご']
  const S = ['塩', '醤油', 'ごま油', 'なし']
  it('5組を返す', () => {
    const r = drawSet(F, S)
    expect(r).not.toBeNull()
    expect(r!).toHaveLength(5)
  })
  it('各組は有効な 具×味付け ペア', () => {
    const r = drawSet(F, S)!
    for (const p of r) {
      expect(F).toContain(p.filling)
      expect(S).toContain(p.seasoning)
    }
  })
  it('fillings空は null', () => expect(drawSet([], S)).toBeNull())
  it('seasonings空は空文字の味付けで生成', () => {
    const r = drawSet(F, [], 3)!
    expect(r).toHaveLength(3)
    for (const p of r) expect(p.seasoning).toBe('')
  })
  it('独立性: 大量試行で同じ具が複数回出る(重複が生じる)', () => {
    // 独立抽選の結果重複が起こることの検証(8具から5組なら重複確率は高い)
    let sawDup = false
    for (let i = 0; i < 300 && !sawDup; i++) {
      const r = drawSet(F, S)!
      const names = r.map(p => p.filling)
      sawDup = new Set(names).size < 5
    }
    expect(sawDup).toBe(true)
  })
})
```

**Step 2: Run test — confirm it fails** (module not found)

**Step 3: Write minimal implementation**
```ts
export interface LotteryResult { filling: string; seasoning: string }

export function drawOne(items: string[]): string | null {
  if (items.length === 0) return null
  return items[Math.floor(Math.random() * items.length)]
}

export function drawSet(
  fillings: string[],
  seasonings: string[],
  count = 5
): LotteryResult[] | null {
  if (fillings.length === 0) return null
  return Array.from({ length: count }, () => ({
    filling: drawOne(fillings)!,
    seasoning: seasonings.length ? drawOne(seasonings)! : '',
  }))
}
```

**Step 4: Run test — confirm it passes**

**Step 5: Commit** `feat: 抽選純関数 drawOne/drawSet`

---

## Task 2: データモデルと正規化

**Files:**
- Create: `src/domain/model.ts`
- Test: `src/domain/model.test.ts`

**Step 1: Write failing test** — 検証項目:
- 正常データはそのまま通る
- null / 不正形状 → 初期値フルバック
- 部分欠損(fillingsのみ等)→ 初期値とマージ
- history の各セット: `results` が LotteryResult[] で各要素が fillings∪正味付け文字列でなく単に string ペアであること(文字列型検証のみ)を検証し、不正セットを除外
- history 6セット → 5セットに切り詰め(古い順に削除 = 配列末尾が新しいと仮定)
- fillings 空配列 → 初期値へフォールバック(具リスト最低1件必須のため)

**Step 3: Write minimal implementation**
```ts
import type { LotteryResult } from './lottery'

export interface HistorySet {
  results: LotteryResult[]   // 5組
  at: number                 // タイムスタンプ
}
export interface AppState {
  fillings: string[]
  seasonings: string[]
  history: HistorySet[]      // 最大5、末尾が最新
}

export const defaultFillings = ['鮭', '梅', 'おかか', '昆布', 'ツナマヨ', '明太子', '焼きたらこ', 'たまご'] as const
export const defaultSeasonings = ['塩', '醤油', 'ごま油', 'なし'] as const

export const MAX_HISTORY = 5
export const MAX_LIST_LEN = 20   // 具・味付けの最大文字数

export function normalizeState(raw: unknown): AppState {
  const fallback = (): AppState => ({
    fillings: [...defaultFillings],
    seasonings: [...defaultSeasonings],
    history: [],
  })
  if (typeof raw !== 'object' || raw === null) return fallback()
  const r = raw as Record<string, unknown>
  const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0
  const isPair = (x: unknown): x is LotteryResult =>
    typeof x === 'object' && x !== null && isStr((x as any).filling) && typeof (x as any).seasoning === 'string'
  const isSet = (x: unknown): x is HistorySet =>
    typeof x === 'Str'.replace('Str', 'object') && x !== null &&
    Array.isArray((x as any).results) &&
    (x as any).results.every(isPair) &&
    typeof (x as any).at === 'number'
  const fillings = Array.isArray(r.fillings) ? r.fillings.filter(isStr) : []
  const seasonings = Array.isArray(r.seasonings) ? r.seasonings.filter(isStr) : []
  const history = Array.isArray(r.history) ? r.history.filter(isSet) : []
  return {
    fillings: fillings.length ? fillings : [...defaultFillings],
    seasonings: seasonings.length ? seasonings : [...defaultSeasonings],
    history: history.slice(-MAX_HISTORY),
  }
}
```
※計画書の `isSet` 内の `(x as 'Str'.replace(...))` は書き損じ。実装は通常の `typeof x === 'object'` とすること。

**Step 5: Commit** `feat: データモデルと正規化`

---

## Task 3: ストレージ層

**Files:**
- Create: `src/storage/appStorage.ts`
- Test: `src/storage/appStorage.test.ts`

**Step 1: Write failing test** — 検証項目:
- 初期状態(空localStorage)→ 初期値
- 保存→読込ラウンドトリップ
- localStorage に不正JSON → 初期値
- saveState が localStorage.setItem を呼ぶ(成功 true / 失敗 false)

**Step 3: implementation**
```ts
import { AppState, normalizeState } from '../domain/model'

export const STORAGE_KEY = 'onigiri-lottery'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return normalizeState(null)
    return normalizeState(JSON.parse(raw))
  } catch {
    return normalizeState(null)
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY,  JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
```

**Step 5: Commit** `feat: localStorage永続化層純関数`

---

## Task 4: カスタムフック useAppState

**Files:**
- Create: `src/hooks/useAppState.ts`
- Test: `src/hooks/useAppState.test.tsx`

**Step 1: Write failing test** — 椾証項目:
- 初回は初期値(loadState を mock して検証)
- addFilling('味しらべ') → fillings に追加
- removeFilling: 最後の1件は削除不可(undefined 返却 or no-op)
- updateFilling: 存在チェック・重複チェック・20文字超は拒否
- recordDraw(5組) → history に追加、6回目で最古が削除され5セット維持
- state 変更のたび effect で saveState が呼ばれる
- clearHistory → history 空配列

API: `useAppState()` → `{ state, addFilling, removeFilling, updateFilling, addSeasoning, removeSeasoning, updateSeasoning, recordDraw, clearHistory, storageAvailable }`

**Step 5: Commit** `feat: useAppState フック`

---

## Task 5: 抽選画面

**Files:**
- Create: `src/screens/LotteryScreen.tsx`
- Test: `src/screens/LotteryScreen.test.tsx`

**Step 1: Write failing test** — drawSet を `vi.mock` して:
- 「まわす」押下で5組が表示される(1〜5の番号付き)
- fillings 0件時は「まわす」disabled + 案内文言
- 抽選結果はそのまま履歴に記録される(recordDraw 呼び出し)
- 「まわす」再押下で新しい結果に入れ替わる

**Step 3: minimal implementation** — App のタブ構造の一部として。アニメーションは CSS のみ(後の Task 8 で調整)

**Step 5: Commit** `feat: 抽選画面`

---

## Task 6: リスト管理画面

**Files:**
- Create: `a g/screens/ManageScreen.tsx`(パス書き損じ: 正しくは `src/screens/ManageScreen.tsx`)
- Test: `src/screens/ManageScreen.test.tsx`

**Step 1: Write failing test** — 検証項目:
- 具/味付けセグメント切替で表示リストが変わる
- 追加: 空入力・重複・21文字は拒否。正常入力で追加
- 削除: 確認ダイアログ(window.confirm を mock)。具の最後の1件は削除不可
- 編集: インライン編集で保存。重複は拒否

**Step 5: Commit** `feat: リスト管理画面`

---

## Task 7: 履歴画面

**最新順表示(5セット)・「全削除」確認ダイアログ。テスト: 表示・クリア。**

**Files:**
- Create: `src/screens/HistoryScreen.tsx`
- Test: `src/screens/HistoryScreen.test.tsx`

**Step 5: Commit** `feat: 履歴画面`

---

## Task 8: App.tsx タブ統合 + デザイン調整

**Files:**
- Create: `src/components/TabBar.tsx`
- Modify: `src/App.tsx`
- Create: `src/App.test.tsx`

**Step 1: Write failing test** — タブ切替(抽選/管理/履歴)・抽選→履歴反映の統合フロー

**Step 3: デザイン適用** — 薄い水色ベース(#EAF4F8)、ミニマル、safe-area、100dvh、44px タップターゲット。frontend-design / ui-design スキル参照。

**Step 5: Commit** `feat: タブ統合とデザイン調整`

---

## Task 9: ビルドとホスティング設定

**Files:**
- Modify: `vite.config.ts` (`base: './'`)

**Step 1:** `npm run build` 成功。dist/ 生成確認。

**Step 2: Commit** `chore: 相対パスbase設定`

---

## 実行モード

1. **Subagent-Driven**(推奨)— タスクごとにサブエージェントをディスパッチし、2段階レビュー(仕様適合 + 品質)
2. **Manual** — ユーザー自身がタスクを実行
