# おにシミュ Phase 2 機能追加 設計書

日付: 2026-08-26
ステータス: 承認待ち
ブランチ: master

## 背景

おにぎり抽選アプリ(React+TS+Vite、GitHub Pages公開済み)に5機能を追加する。
実装順序: PWA化 → 共有/コピー → サウンド → 並べ替え → カテゴリタグ

## 機能設計

### F1: PWA化

- `public/manifest.webmanifest` を追加
  - name: おにシミュ / short_name: おにシミュ
  - display: standalone, theme_color: #cfe6f0, background_color: #cfe6f0
  - icons: 192px / 512px PNG(apple-touch-icon から拡大生成)+ maskable対応
- `public/sw.js`: プレキャッシュ(workbox不使用、手書きSW)
  - インストール時にアプリシェルをキャッシュ
  - fetch: キャッシュファースト(同一オリジンのみ)、バージョン管理はキャッシュ名のバージョン文字列で
- `src/main.tsx` で SW 登録(production のみ)
- **iOS 注意点**: スタンドアロン表示は `apple-mobile-web-app-capable` 既存設定で有効。アドレスバーが消えフルスクリーン化

### F2: 結果の共有/コピー

- 抽選結果の下に「結果を共有」ボタンを配置
- テキスト形式:
  ```
  おにシミュ抽選結果 🍙
  1. 鮭 × 塩
  2. 梅 × 醤油
  ```
- `navigator.share` が利用可能なら共有シート、不可なら `navigator.clipboard.writeText` にフォールバック
- 成功時はボタン文言を一時的に「コピーしました」に変更(1.5秒)

### F3: サウンド効果

- `src/lib/sound.ts`: Web Audio API 合成音ユーティリティ
  - `playSpin()`: 短い上昇ポンッ(sine波 440→880Hz, 0.1s)
  - `playStop()`: カチッ(square波 短音, 0.05s)
  - AudioContext は初回ユーザー操作時に遅延生成(iOS 制約対応)
- 抽選ボタン押下で playSpin、結果表示で playStop
- 設定は `AppState.soundEnabled`(初期値 true)、リスト画面上部にミュートtoggle
- `prefers-reduced-motion` と同様にユーザー設定を優先

### F4: リスト並べ替え(ドラッグ&ドロップ)

- 対象: ManageScreen の具リスト・味付けリスト
- 実装: HTML5 Drag and Drop API
  - 各行にドラッグハンドル(☰)
  - `draggable` 属性 + `onDragStart` / `onDragOver` / `onDrop`
  - ドラッグ中の行に半透明スタイル
- **iOS 対応**: HTML5 DnDはiOS Safariで動作しないため、pointer eventsベースのフォールバック実装(長押しでドラッグ開始)
  - `touch-action: none` をハンドルに設定
  - pointerdown → 長押し300ms → 移動追跡 → ドロップ位置計算
- モデル: `MOVE_FILLING` / `MOVE_SEASONING` action、`moveFilling(from, to)` / `moveSeasoning(from, to)`
- 除外リスト(excluded)は名前参照のため順序変更の影響なし

### F5: 具カテゴリ/タグ

- `type Category = 'meat' | 'fish' | 'classic' | 'other'`
- `AppState.fillingCategories: Record<string, Category>`(具名→カテゴリ、デフォルト全て 'classic'? → 未設定は 'other')
- デフォルトカテゴリ初期値:
  - 唐揚げ: meat / 鮭・たらこ・明太子: fish / 鮭・梅・おかか・昆布・ツナマヨ: classic
  - ※重複しないよう一意に割当: 鮭=fish(魚), たらこ=fish, 明太子=fish, 唐揚げ=meat, 梅=classic, おかか=classic, 昆布=classic, ツナマヨ=fish
- ManageScreen: 各具行にカテゴリ選択(小さなセレクト or チップ)
- LotteryScreen: カテゴリチップ(全部/肉/魚介/定番/その他)を表示、タップで抽選対象を絞り込み
  - 絞り込みは「有効な具」のさらに絞り込み(除外とも併用)
- normalizeState: 未知の具名のカテゴリ行を削除、欠損は 'other' 補完

## データモデル変更(model.ts)

```ts
export type Category = 'meat' | 'fish' | 'classic' | 'other'
export const CATEGORIES: Category[] = ['meat', 'fish', 'classic', 'other']
export const CATEGORY_LABELS: Record<Category, string> = {
  meat: '肉', fish: '魚介', classic: '定番', other: 'その他'
}

interface AppState {
  fillings: string[]
  seasonings: string[]
  excludedFillings: string[]
  excludedSeasonings: string[]
  settings: LotterySettings
  soundEnabled: boolean                    // NEW
  fillingCategories: Record<string, Category>  // NEW
  history: HistorySet[]
}
```

## 互換性・移行

- 既存 localStorage スキーマに新フィールド追加 → normalizeState がデフォルト補完(後方互換)
- normalizeSettings と同様に `normalizeSoundEnabled` / `normalizeCategories` を実装

## テスト方針

- model.ts: カテゴリ正規化テスト(未知具名削除・欠損補完)
- useAppState: MOVE_FILLING/MOVE_SEASONING、TOGGLE_SOUND、SET_CATEGORY の reducer テスト
- sound.ts: AudioContext モックで再生呼び出しテスト
- ManageScreen/LotteryScreen: 既存テストのモック更新 + 並べ替え・チップUIテスト

## 非ゴール

- 複数タグ付け、タグの自由入力(将来拡張)
- 並べ替えのアニメーション演出
- 通知・バックグラウンド同期
