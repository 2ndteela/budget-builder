import { useState, useEffect } from 'react'
import './App.css'
import Tabs from './components/Tabs/Tabs'
import ProjectedCosts from './components/ProjectedCosts/ProjectedCosts'
import TrackedCosts from './components/TrackedCosts/TrackedCosts'
import BudgetReport from './components/BudgetReport/BudgetReport'

const parseMonthParam = (param) => {
  const [year, month] = param.split('-').map(Number)
  return new Date(year, month - 1, 1)
}
const formatMonthParam = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function MonthRangePickerHeader({ date, onUpdate }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
  const currentDate = date ? date : new Date()

  const [menuOpen, setMenuOpen] = useState(false)
  const [month, setMonth] = useState(currentDate.getMonth())
  const [year, setYear] = useState(currentDate.getFullYear())
  const [tempMonth, setTempMonth] = useState(month)
  const [tempYear, setTempYear] = useState(year)

  useEffect(() => {
    let initialized = false
    if (!date || initialized) return
    else if (!initialized) {
      // eslint-disable-next-line no-useless-assignment
      initialized = true
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMonth(date.getMonth())
      setYear(date.getFullYear())
      setTempMonth(date.getMonth())
      setTempYear(date.getFullYear())
    }
  }, [date])

  const handleApply = () => {
    setMonth(tempMonth)
    setYear(tempYear)
    const newDate = new Date(tempYear, tempMonth, 1)
    onUpdate?.(newDate)
    setMenuOpen(false)
  }

  const handleCancel = () => {
    setTempMonth(month)
    setTempYear(year)
    setMenuOpen(false)
  }

  const handleOpenMenu = () => {
    setTempMonth(month)
    setTempYear(year)
    setMenuOpen(true)
  }

  return (
    <div className='month-picker-container'>
      <button className='month-picker-button' onClick={handleOpenMenu}>
        {dateFormatter.format(currentDate)}
      </button>
      {menuOpen && (
        <div className='date-menu'>
          <div className='month-grid'>
            {months.map((m, idx) => (
              <button
                key={idx}
                className={`month-button ${tempMonth === idx ? 'selected' : ''}`}
                onClick={() => setTempMonth(idx)}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            type='number'
            className='year-input'
            value={tempYear}
            onChange={({ target }) => setTempYear(parseInt(target.value) || currentDate.getFullYear())}
          />
          <div className='menu-actions'>
            <button className='menu-cancel-button' onClick={handleCancel}>Cancel</button>
            <button className='menu-apply-button' onClick={handleApply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  )
}


function App() {
  const [showEndDateRange, setShowEndDateRange] = useState(false)
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const startParam = params.get('startDate')
    const endParam = params.get('endDate')

    const start = startParam ? parseMonthParam(startParam) : new Date()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartDate(start)

    if (endParam) {
      setEndDate(parseMonthParam(endParam))
      setShowEndDateRange(true)
    }

    if (!startParam) {
      const newParams = new URLSearchParams()
      newParams.set('startDate', formatMonthParam(start))
      window.history.replaceState({}, '', `${window.location.pathname}?${newParams}`)
    }
  }, [])

  const updateURL = (start, end) => {
    const params = new URLSearchParams(window.location.search)
    params.set('startDate', formatMonthParam(start))
    if (showEndDateRange && end) params.set('endDate', formatMonthParam(end))
    else params.delete('endDate')
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
  }

  const handleStartDateChange = (date) => {
    setStartDate(date)
    updateURL(date, endDate)
  }

  const handleEndDateChange = (date) => {
    setEndDate(date)
    updateURL(startDate, date)
  }

  const handleToggleEndDate = (show) => {
    setShowEndDateRange(show)
    const params = new URLSearchParams(window.location.search)
    params.set('startDate', formatMonthParam(startDate))
    if (show) params.set('endDate', formatMonthParam(endDate))
    else params.delete('endDate')

    window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
  }

  return (
    <div>
      <header>
        Budget Balancer
      </header>
      <div id="page-container">
        <div id="page-content">
          <div className='date-range-picker'>
            <MonthRangePickerHeader date={startDate} onUpdate={handleStartDateChange} />
            {!showEndDateRange && (
              <button className='range-toggle-button' onClick={() => handleToggleEndDate(true)}>
                + Add End Date
              </button>
            )}
            {showEndDateRange && (
              <>
                <span className='range-separator'>to</span>
                <MonthRangePickerHeader date={endDate} onUpdate={handleEndDateChange} />
                <button className='range-toggle-button remove' onClick={() => handleToggleEndDate(false)}>
                  ✕
                </button>
              </>
            )}
          </div>

          <Tabs tabs={[
            {
              title: 'Planning and Management',
              key: 'planning',
              children: (<ProjectedCosts />),
            },
            {
              title: 'Tracked Costs',
              key: 'tracked',
              children: (<TrackedCosts />),
            },
            {
              title: 'Budget Analysis',
              key: 'analysis',
              children: (<BudgetReport />)
            }
          ]} />
        </div>
      </div>
    </div>
  )
}

export default App
