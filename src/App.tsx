import { useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { LotteryScreen } from './screens/LotteryScreen'
import { ManageScreen } from './screens/ManageScreen'
import { HistoryScreen } from './screens/HistoryScreen'

type TabId = 'lottery' | 'manage' | 'history'

const TABS: { id: TabId; label: string }[] = [
  { id: 'lottery', label: '抽選' },
  { id: 'manage', label: 'リスト' },
  { id: 'history', label: '履歴' },
]

export function App() {
  const app = useAppState()
  const [tab, setTab] = useState<TabId>('lottery')

  return (
    <div className="app">
      {!app.storageAvailable && (
        <p className="storage-warning" role="alert">
          保存機能が使えないため、再読み込みするとデータが消えます。
        </p>
      )}
      <main className="content">
        {tab === 'lottery' && <LotteryScreen app={app} />}
        {tab === 'manage' && <ManageScreen app={app} />}
        {tab === 'history' && <HistoryScreen app={app} />}
      </main>
      <nav className="tabbar" role="tablist" aria-label="画面切替">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
