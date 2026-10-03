import { useState, useCallback, useMemo, useRef } from 'react'
import CompressedButton from '../../../../shared/CompressedButton/CompressedButton'
import { MdAutoAwesome, MdClose, MdAdd, MdSort } from 'react-icons/md'
import SuggestedExpenses from '../SuggestedExpenses/SuggestedExpenses'
import ProjectedExpenseCard from './ProjectedExpenseCard'
import './projectedExpenses.css'
import useAppData from '../../../../../DataContext/useAppData'

const SORT_LABELS = { name: 'Name', total: 'Total' }

// Matches the card sizing in projectedExpenses.css
const MIN_CARD_WIDTH = 320
const CARD_GAP = 16
const MOBILE_BREAKPOINT = 768

// How many card columns fit in the container. Columns are laid out by hand rather than with
// a grid so that expanding a card only pushes down the cards beneath it, not the whole row.
function useColumnCount() {
  const [columnCount, setColumnCount] = useState(1)
  const observerRef = useRef(null)

  // A callback ref, since the container only mounts once there are expenses to show
  const ref = useCallback((element) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      setColumnCount(window.innerWidth <= MOBILE_BREAKPOINT
        ? 1
        : Math.max(1, Math.floor((width + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP))))
    })
    observer.observe(element)
    observerRef.current = observer
  }, [])

  return [ref, columnCount]
}

export default function ProjectedExpenses({ monthlyBudgetId }) {
  const [newExpense, setNewExpense] = useState({})
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [suggestedExpenses, setSuggestedExpenses] = useState([])
  const [sortField, setSortField] = useState('name') // 'name' or 'total'

  const {
    categories: { categories },
    monthlyBudgets: {
      monthlyBudgets,
      addNewProjectedExpense,
      updateProjectedExpense,
      deleteProjectedExpense
    }
  } = useAppData()

  const budget = monthlyBudgets.find((item) => item.id === monthlyBudgetId)
  const expenses = useMemo(() => {
    return budget?.projectedExpenses || []
  }, [budget?.projectedExpenses])

  // What has actually been booked against each plan this month, keyed by projected expense id
  const spentByExpense = useMemo(() => {
    return (budget?.transactions || []).reduce((acc, transaction) => {
      if (transaction.projectedExpenseId == null) return acc
      acc[transaction.projectedExpenseId] = (acc[transaction.projectedExpenseId] || 0) + (transaction.amount || 0)
      return acc
    }, {})
  }, [budget?.transactions])

  const categoriesWithExpenses = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const existing = acc.find((group) => group.category.id === expense.categoryId)
      if (existing) {
        existing.expenses.push(expense)
        return acc
      }

      // The full category carries the color; the one nested on the expense may not
      const category = categories.find((item) => item.id === expense.categoryId) || expense.category
      return [...acc, { category, expenses: [expense] }]
    }, [])
  }, [expenses, categories])

  const sortedCategories = useMemo(() => {
    const total = (group) => group.expenses.reduce((sum, expense) => sum + expense.value, 0)

    return [...categoriesWithExpenses].sort((a, b) => sortField === 'name'
      ? a.category.name.localeCompare(b.category.name)
      : total(b) - total(a))
  }, [categoriesWithExpenses, sortField])

  const [cardsRef, columnCount] = useColumnCount()

  // Dealt round-robin so the sort order still reads left to right, top to bottom
  const columns = useMemo(() => {
    return sortedCategories.reduce((acc, group, index) => {
      acc[index % columnCount].push(group)
      return acc
    }, Array.from({ length: columnCount }, () => []))
  }, [sortedCategories, columnCount])

  const handleNewExpenseChange = (field, value) => setNewExpense((v) => ({ ...v, [field]: value }))

  const handleCancelNewExpense = () => {
    setNewExpense({})
    setShowNewExpense(false)
  }

  const handleCreateExpense = async () => {
    // A name is all that is required. Sending no category lets the server file the
    // expense under Unassigned rather than blocking the user on a decision.
    if (!newExpense.name?.trim()) return

    try {
      await addNewProjectedExpense({
        ...newExpense,
        name: newExpense.name.trim(),
        value: Number(newExpense.value) || 0,
        categoryId: Number(newExpense.categoryId) || 0,
        monthlyBudgetId
      })
      handleCancelNewExpense()
    } catch (err) {
      alert('Error creating expense')
      console.error(err)
    }
  }

  const createSuggestions = async () => {
    try {
      const resp = await fetch('http://localhost:5102/projected-expenses/suggestions')
      if (!resp.ok) throw new Error('Failed to fetch suggestions')

      const categories = await resp.json()
      const existingNames = expenses.map((expense) => expense.name.toLowerCase())

      // Drop anything already planned this month, then any category left with nothing to suggest
      setSuggestedExpenses(categories
        .map((category) => ({
          ...category,
          projectedExpenses: category.projectedExpenses
            .filter((suggestion) => !existingNames.includes(suggestion.name.toLowerCase()))
            .map((suggestion) => ({ ...suggestion, value: suggestion.suggestedValue }))
        }))
        .filter((category) => category.projectedExpenses.length > 0))
    } catch (err) {
      alert('Error creating suggestions')
      console.error(err)
    }
  }

  // Unmounting the suggestions brings back the Create Suggestions button
  const clearSuggestions = useCallback(() => setSuggestedExpenses([]), [])

  // Resolves whether the add went through, so the card knows to take the suggestion off
  const addSuggestion = useCallback(async (suggestion) => {
    try {
      await addNewProjectedExpense({
        name: suggestion.name,
        value: suggestion.value,
        // Suggestions come back with a category the server inferred, or Unassigned when
        // it could not infer one, so a suggestion is always acceptable as-is.
        categoryId: suggestion.categoryId || 0,
        monthlyBudgetId
      })
      return true
    } catch (err) {
      alert('Error adding suggested expense')
      console.error(err)
      return false
    }
  }, [addNewProjectedExpense, monthlyBudgetId])

  return (
    <div className='budget-expenses-panel'>
      {suggestedExpenses.length > 0 && (
        <div style={{ paddingBottom: '24px' }} >
          <SuggestedExpenses
            suggestions={suggestedExpenses}
            onAdd={addSuggestion}
            onCleared={clearSuggestions}
          />
        </div>
      )}
      <div className='row-container budget-expenses-header'>
        <h4>Projected Expenses</h4>
        <div className='row-container'>
          {suggestedExpenses.length === 0 && (
            <CompressedButton color='teal' Icon={MdAutoAwesome} onClick={createSuggestions}>
              Create Suggestions
            </CompressedButton>
          )}
          <CompressedButton
            color='gray'
            Icon={MdSort}
            onClick={() => setSortField((field) => field === 'name' ? 'total' : 'name')}
          >
            {`Sort: ${SORT_LABELS[sortField]}`}
          </CompressedButton>
          <CompressedButton
            onClick={() => showNewExpense ? handleCancelNewExpense() : setShowNewExpense(true)}
            Icon={showNewExpense ? MdClose : MdAdd}
          >
            {showNewExpense ? 'Cancel' : 'New Expense'}
          </CompressedButton>
        </div>
      </div>
      {showNewExpense && (
        <div className='new-expense-form'>
          <input
            type='text'
            placeholder='New expense'
            value={newExpense.name || ''}
            onChange={({ target }) => handleNewExpenseChange('name', target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleCreateExpense()}
            className='new-expense-name'
          />
          <input
            type='number'
            placeholder='0'
            value={newExpense.value ?? ''}
            onChange={({ target }) => handleNewExpenseChange('value', target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleCreateExpense()}
            className='new-expense-value'
          />
          <select
            value={newExpense.categoryId || 0}
            onChange={({ target }) => handleNewExpenseChange('categoryId', target.value)}
            className='new-expense-category'
          >
            <option value={0}>Unassigned</option>
            {categories.filter((c) => !c.isSystem).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className='add-expense-button btn-green' onClick={handleCreateExpense}>
            Add
          </button>
        </div>
      )}
      {expenses.length === 0 && !showNewExpense ? (
        <div className='empty-budget-message'>No projected expenses yet</div>
      ) : (
        <div className='projected-expense-cards' ref={cardsRef}>
          {columns.map((column, columnIndex) => (
            <div className='projected-expense-column' key={columnIndex}>
              {column.map(({ category, expenses: categoryExpenses }) => (
                <ProjectedExpenseCard
                  key={category.id}
                  category={category}
                  expenses={categoryExpenses}
                  spentByExpense={spentByExpense}
                  onUpdate={updateProjectedExpense}
                  onRemove={deleteProjectedExpense}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
