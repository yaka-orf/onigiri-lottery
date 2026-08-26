# おにシミュ Phase 2 実装計画

設計書: docs/plans/2026-08-26-onigiri-phase2-design.md
実装順: F1 PWA → F2 共有 → F3 サウンド → F4 並べ替え → F5 カテゴリ
各タスク: TDD(RED→GREEN→commit)

## Task 1: F1 PWA — manifest + アイコン生成
- manifest.webmanifest 作成(name/icon/display/theme_color)
- 192/512 PNG生成(apple-touch-icon.svgからChrome headlessで生成、maskableは背景埋め済みで代用)
- index.html に manifest link 追加
- 検証: ビルド後にdist/manifest.webmanifestが存在、manifestのJSONがvalid
- コミット: "feat: PWA manifest追加"

## Task 2: F1 PWA — Service Worker
- public/sw.js: precache(アイコン+index.html)、cache-first fetch
- src/main.tsx: SW登録(productionのみ)
- 検証: ビルド→serve→SW登録成功、オフラインでindex.htmlが200(cache由来)
- コミット: "feat: service worker追加(オフライン対応)"

## Task 3: F2 共有 — ユーティリティ
- src/lib/share.ts: buildShareText(results), shareOrCopy(results) → 'shared'|'copied'|'failed'
- テスト: buildShareTextの形式(番号・×区切り・ヘッダ)、shareOrCopyのフォールバック分岐(navigator.share有無をモック)
- コミット: "feat: 共有テキスト生成・share/copyフォールバック"

## Task 4: F2 共有 — LotteryScreen UI
- 結果下に「結果を共有」ボタン、成功後1.5秒「コピーしました」表示
- テスト: ボタンクリック→shareOrCopy呼び出し・状態表示
- コミット: "feat: 抽選結果の共有ボタン"

## Task 5: F3 サウンド — sound.ts
- src/lib/sound.ts: ensureAudio(), playSpin(), playStop()(AudioContext遅延生成・合成音)
- テスト: AudioContextモック、playSpin/playStopでoscillator.start/stop呼び出し
- コミット: "feat: Web Audio合成音ユーティリティ"

## Task 6: F3 サウンド — 状態とUI
- model.ts: soundEnabled: boolean追加・normalize対応
- useAppState: TOGGLE_SOUND action + toggleSound()
- LotteryScreen: 抽選でplaySpin→0.6s後playStop、ManageScreenにミュートtoggle
- テスト: normalize(soundEnabledデフォルトtrue)、reducer、画面モック更新
- コミット: "feat: サウンド効果(ミュートtoggle・設定永続化)"

## Task 7: F4 並べ替え — ドメイン/フック
- useAppState: MOVE_FILLING/MOVE_SEASONING actions + moveFilling(from,to)/moveSeasoning(from,to)
- テスト: move境界(先頭→末尾、末尾→先頭、同位置no-op)、excludedとの整合
- コミット: "feat: リスト並べ替えの状態管理"

## Task 8: F4 並べ替え — ManageScreen UI
- HTML5 DnD(デスクトップ)+ pointer eventsフォールバック(iOS長押し)
- ドラッグハンドル(☰)付き、touch-action:none
- テスト: moveFilling呼び出し(DnDイベントシミュレート)
- コミット: "feat: リストのドラッグ&ドロップ並べ替え"

## Task 9: F5 カテゴリ — ドメイン
- model.ts: Category型、CATEGORY_LABELS、fillingCategories追加、normalizeCategories(未知削除・欠損'other'補完)、デフォルトカテゴリ
- テスト: 正規化(欠損補完/未知除去/デフォルト8具の割当)
- コミット: "feat: 具カテゴリのデータモデル"

## Task 10: F5 カテゴリ — 状態とUI
- useAppState: SET_CATEGORY action + setFillingCategory(name, cat)
- LotteryScreen: カテゴリチップ(全部/肉/魚介/定番/その他)で絞り込み抽選
- ManageScreen: 具行にカテゴリ変更UI
- テスト: 絞り込み動作(有効具×カテゴリ)、チップUI、モック更新
- コミット: "feat: カテゴリ絞り込み抽選"

## Task 11: 統合検証
- 全テスト・tsc・ビルド・デプロイ
- iPhone実機確認事項をユーザーに提示
- コミット: デプロイ

## 検証コマンド(共通)
- npx vitest run
- npx tsc -b --noEmit
- npm run build
