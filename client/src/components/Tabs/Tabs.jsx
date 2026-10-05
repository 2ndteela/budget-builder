import { useState, useCallback } from 'react'
import './tabs.css'

function getActiveTabFromQuery() {
  return new URLSearchParams(window.location.search).get('activeTab')
}

function BodyContent({ tabs, activeTab }) {
  const active = tabs.find((t) => t.key === activeTab)
  return active?.children || null
}

export default function Tabs({ tabs = [] }) {
  const [selectedTab, setSelectedTab] = useState(() => getActiveTabFromQuery())
  // Falls back to the first tab when nothing is selected or the selection matches no tab
  // (e.g. an activeTab param left over from another page)
  const activeTab = tabs.some((t) => t.key === selectedTab) ? selectedTab : tabs[0]?.key || ''

  const updateOpenTab = useCallback((tabKey) => {
    setSelectedTab(tabKey)
    const url = new URL(window.location.href)
    url.searchParams.set('activeTab', tabKey)
    window.history.replaceState({}, '', url)
  }, [])

  return (
    <div className='tabs-container'>
      <div className='tabs-headers'>
        <div className='tabs-buttons'>
          {tabs?.map((t) => (
            <button
              key={t.key}
              className={`${activeTab === t.key ? 'active-tab' : ''}`}
              onClick={() => updateOpenTab(t.key)}
            >{t.title}</button>)
          )}
        </div>
        <select
          className='tabs-dropdown'
          value={activeTab}
          onChange={(e) => updateOpenTab(e.target.value)}
        >
          {tabs?.map((t) => (
            <option key={t.key} value={t.key}>{t.title}</option>
          ))}
        </select>
      </div>
      <div className='tabs-body'>
        <BodyContent {...{ tabs, activeTab }} />
      </div>
    </div>
  )
}
