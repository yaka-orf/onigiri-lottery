import { useState, useRef } from 'react'
import type { UseAppState } from '../hooks/useAppState'
import { DEFAULT_CATEGORY, type Category } from '../domain/model'

interface Props {
  app: UseAppState
}

type Kind = 'fillings' | 'seasonings' | 'tags'

export function ManageScreen({ app }: Props) {
  const [kind, setKind] = useState<Kind>('fillings')
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editCategory, setEditCategory] = useState<Category>(DEFAULT_CATEGORY)
  // ドラッグ&ドロップ並べ替え状態
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragCounter = useRef(0)

  const list = kind === 'tags' ? app.state.tags.map((t) => t.label) : app.state[kind]
  const excluded =
    kind === 'fillings' ? app.state.excludedFillings : []
  const isFillings = kind === 'fillings'
  const isTags = kind === 'tags'
  const isDefaultTag = (label: string): boolean =>
    app.state.tags.find((t) => t.label === label)?.id === DEFAULT_CATEGORY

  const add = () => {
    const name = input.trim()
    if (!name) return
    const ok = isTags
      ? app.addTag(name)
      : isFillings
        ? app.addFilling(name)
        : app.addSeasoning(name)
    if (ok) setInput('')
  }

  const remove = (name: string) => {
    if (isTags) {
      const tag = app.state.tags.find((t) => t.label === name)
      if (!tag) return
      if (!window.confirm('このタグを削除しますか?(付いていた具は「その他」になります)')) return
      app.removeTag(tag.id)
      return
    }
    const msg = isFillings
      ? `「${name}」を具リストから削除しますか?`
      : `「${name}」を味付けリストから削除しますか?`
    if (!window.confirm(msg)) return
    if (isFillings) app.removeFilling(name)
    else app.removeSeasoning(name)
  }

  const startEdit = (name: string) => {
    setEditing(name)
    setEditValue(name)
    setEditCategory(app.state.fillingCategories[name] ?? DEFAULT_CATEGORY)
  }

  const saveEdit = () => {
    if (editing === null) return
    const newName = editValue.trim()
    if (isTags) {
      const tag = app.state.tags.find((t) => t.label === editing)
      if (tag && app.renameTag(tag.id, newName)) setEditing(null)
      return
    }
    if (isFillings) {
      const originalCat = app.state.fillingCategories[editing] ?? DEFAULT_CATEGORY
      const catChanged = editCategory !== originalCat
      if (!newName) {
        setEditing(null)
        return
      }
      if (newName === editing) {
        if (catChanged) app.setFillingCategory(editing, editCategory)
        setEditing(null)
        return
      }
      if (app.updateFilling(editing, newName)) {
        if (catChanged) app.setFillingCategory(newName, editCategory)
        setEditing(null)
      }
      return
    }
    if (!newName || newName === editing) {
      setEditing(null)
      return
    }
    const ok = app.updateSeasoning(editing, newName)
    if (ok) setEditing(null)
  }

  const toggleExclude = (name: string) => {
    if (isFillings) app.toggleExcludeFilling(name)
    else if (kind === 'seasonings') app.toggleExcludeSeasoning(name)
  }

  // --- ドラッグ&ドロップ並べ替え(具・味付け・タグ) ---
  const move = (from: number, to: number) => {
    if (isTags) app.moveTag(from, to)
    else if (isFillings) app.moveFilling(from, to)
    else app.moveSeasoning(from, to)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      move(dragIndex, index)
    }
    setDragIndex(null)
    setOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
    dragCounter.current = 0
  }

  // --- タッチ/ポインター並べ替え(iOS Safari は HTML5 DnD 非対応のため) ---
  const [touchDrag, setTouchDrag] = useState<{
    from: number
    currentIndex: number
    y: number
    startY: number
  } | null>(null)
  const rowHeightRef = useRef(0)
  const listRef = useRef<HTMLUListElement>(null)

  const startTouchDrag = (from: number, y: number) => {
    const row = listRef.current?.children[from] as HTMLElement | undefined
    rowHeightRef.current = row ? row.offsetHeight : 48
    setTouchDrag({ from, currentIndex: from, y, startY: y })
  }

  const moveTouchDrag = (y: number) => {
    setTouchDrag((d) => {
      if (!d) return d
      const delta = Math.round((y - d.y) / rowHeightRef.current)
      const next = Math.max(
        0,
        Math.min(list.length - 1, d.from + delta),
      )
      return { ...d, currentIndex: next, y: d.y }
    })
  }

  // ドラッグ行の見た目のオフセット(指に追従)
  const touchOffset = (index: number): number => {
    if (!touchDrag) return 0
    if (touchDrag.from === index) {
      // ドラッグ中の行: currentIndex の位置までずらす
      return (touchDrag.currentIndex - touchDrag.from) * rowHeightRef.current
    }
    // それ以外の行: ドラッグ行が通り過ぎる分を詰める
    const { from, currentIndex } = touchDrag
    if (from < currentIndex && index > from && index <= currentIndex) {
      return -rowHeightRef.current
    }
    if (from > currentIndex && index >= currentIndex && index < from) {
      return rowHeightRef.current
    }
    return 0
  }

  const endTouchDrag = () => {
    setTouchDrag((d) => {
      if (d && d.currentIndex !== d.from) {
        move(d.from, d.currentIndex)
      }
      return null
    })
  }

  return (
    <div className="manage-screen">
      <details className="advanced-settings">
        <summary>詳細設定</summary>
        <div className="advanced-body">
          <label className="setting-row">
            <input
              type="checkbox"
              checked={app.state.settings.uniqueTags}
              onChange={(e) => app.setUniqueTags(e.target.checked)}
            />
            <span>2具モードで同じタグ同士の組み合わせを発生させない</span>
          </label>
          <label className="setting-row">
            <input
              type="checkbox"
              checked={app.state.settings.tagFilterEnabled !== false}
              onChange={(e) => app.setTagFilter(e.target.checked)}
            />
            <span>作成画面にタグ指定を表示する</span>
          </label>
          <label className="setting-row">
            <input
              type="checkbox"
              checked={app.state.soundEnabled}
              onChange={(e) => {
                if (e.target.checked !== app.state.soundEnabled) app.toggleSound()
              }}
              aria-label="サウンドをONにする"
            />
            <span>サウンドをONにする</span>
          </label>
        </div>
      </details>

      <div className="segment" role="tablist" aria-label="リスト種別">
        <button
          type="button"
          role="tab"
          aria-selected={isFillings}
          className={isFillings ? 'active' : ''}
          onClick={() => setKind('fillings')}
        >
          具
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'seasonings'}
          className={kind === 'seasonings' ? 'active' : ''}
          onClick={() => setKind('seasonings')}
        >
          味付け
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isTags}
          className={isTags ? 'active' : ''}
          onClick={() => setKind('tags')}
        >
          タグ
        </button>
      </div>

      {!isTags && (
        <p className="exclude-hint">「除外」をタップすると抽選対象から外れます(リストには残ります)</p>
      )}

      <ul className="item-list" ref={listRef}>
        {list.map((name, index) => {
          const isExcluded = excluded.includes(name)
          const isDragging = dragIndex === index || touchDrag?.from === index
          const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
          const isTouchTarget = touchDrag?.currentIndex === index && touchDrag.from !== index
          return (
            <li
              key={name}
              className={`item-row${isExcluded ? ' excluded' : ''}${isDragging ? ' dragging' : ''}${isOver || isTouchTarget ? ' drag-over' : ''}`}
              style={
                touchDrag
                  ? {
                      transform: `translateY(${touchOffset(index)}px)`,
                      transition: touchDrag.from === index ? 'none' : 'transform 0.15s ease',
                      zIndex: touchDrag.from === index ? 10 : undefined,
                      position: touchDrag.from === index ? 'relative' : undefined,
                      boxShadow: touchDrag.from === index ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
                    }
                  : undefined
              }
              draggable={!isExcluded}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {editing === name ? (
                <>
                  <input
                    className="edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    aria-label={`${name}を編集`}
                  />
                  {isFillings && (
                    <select
                      className="category-select"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as Category)}
                      aria-label={`${name}のタグ`}
                    >
                      {app.state.tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <button type="button" onClick={saveEdit}>
                    保存
                  </button>
                  <button type="button" onClick={() => setEditing(null)}>
                    キャンセル
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="drag-handle"
                    aria-label={`${name}を並べ替え`}
                    onPointerDown={(e) => {
                      if (isExcluded || e.pointerType === 'mouse') return
                      startTouchDrag(index, e.clientY)
                    }}
                    onPointerMove={(e) => {
                      if (touchDrag?.from === index && e.pointerType !== 'mouse') {
                        moveTouchDrag(e.clientY)
                      }
                    }}
                    onPointerUp={endTouchDrag}
                    onPointerCancel={endTouchDrag}
                  >
                    ☰
                  </button>
                  <span className="item-name">
                    {name}
                    {isTags && isDefaultTag(name) && <span className="tag-note"> (既定)</span>}
                  </span>
                  {isFillings && (
                    <select
                      className="category-select"
                      value={app.state.fillingCategories[name] ?? DEFAULT_CATEGORY}
                      onChange={(e) =>
                        app.setFillingCategory(
                          name,
                          e.target.value as Category,
                        )
                      }
                      aria-label={`${name}のカテゴリ`}
                    >
                      {app.state.tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {!isTags && (
                    <button
                      type="button"
                      className="exclude-btn"
                      onClick={() => toggleExclude(name)}
                      aria-pressed={isExcluded}
                    >
                      {isExcluded ? '解除' : '除外'}
                    </button>
                  )}
                  <button type="button" onClick={() => startEdit(name)}>
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(name)}
                    disabled={
                      (isFillings && list.length <= 1) ||
                      (isTags && isDefaultTag(name))
                    }
                    aria-label={isTags ? `${name}を削除` : undefined}
                  >
                    削除
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>

      <div className="add-row">
        <input
          className="add-input"
          placeholder={isTags ? '新しいタグを追加' : isFillings ? '新しい具を追加' : '新しい味付けを追加'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="button" onClick={add}>
          追加
        </button>
      </div>
    </div>
  )
}
