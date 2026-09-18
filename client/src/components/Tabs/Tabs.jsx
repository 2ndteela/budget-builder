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
  const [activeTab, setActiveTab] = useState(() => getActiveTabFromQuery() || tabs[0]?.key || '')

  const updateOpenTab = useCallback((tabKey) => {
    setActiveTab(tabKey)
    const url = new URL(window.location.href)
    url.searchParams.set('activeTab', tabKey)
    window.history.replaceState({}, '', url)
  }, [])

  return (
    <div className='tabs-container'>
      <div className='tabs-headers'>
        {tabs?.map((t) => (
          <button
            key={t.key}
            className={`${activeTab === t.key ? 'active-tab' : ''}`}
            onClick={() => updateOpenTab(t.key)}
          >{t.title}</button>)
        )}
      </div>
      <div className='tabs-body'>
        <BodyContent {...{ tabs, activeTab }} />
      </div>
    </div>
  )
}
