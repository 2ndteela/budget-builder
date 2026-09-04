import { useCallback, useMemo, useState } from 'react'
import { MdAdd, MdClose, MdDelete, MdEdit, MdSave } from 'react-icons/md'
import ExpansionPanel from '../ExpansionPanel/ExpansionPanel'
import './projectedCosts.css'
import useAppData from '../../DataContext/useAppData'
import LoadingSpinner from '../shared/LoadingSpinner/LoadingSpinner'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(amount || 0)

function parseBudgetMonth(startDate) {
  const [year, month] = startDate?.split('-').map(Number) || []
  const now = new Date()

  return year && month >= 1 && month <= 12
    ? { year, month }
    : { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function ProjectedExpenseRow({ expense, categories, onUpdate, onRemove }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedExpense, setEditedExpense] = useState(expense)
  const category = categories.find((item) => item.id === expense.categoryId)

  const handleSave = () => {
    if (editedExpense.name.trim() === '') return

    onUpdate({ ...editedExpense, name: editedExpense.name.trim() })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedExpense(expense)
    setIsEditing(false)
  }

  return (
    <tr className={`projected-expense-table-row color-${category?.color || 'gray'}`}>
      <td>
        {isEditing ? (
          <input
            type='text'
            value={editedExpense.name}
            onChange={({ target }) => setEditedExpense({ ...editedExpense, name: target.value })}
          />
        ) : expense.name}
      </td>
      <td>
        {isEditing ? (
          <input
            type='number'
            value={editedExpense.value}
            onChange={({ target }) => setEditedExpense({ ...editedExpense, value: Number(target.value) || 0 })}
          />
        ) : formatCurrency(expense.value)}
      </td>
      <td>
        {isEditing ? (
          <select
            value={editedExpense.categoryId}
            onChange={({ target }) => setEditedExpense({ ...editedExpense, categoryId: Number(target.value) })}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        ) : category?.name}
      </td>
      <td className='actions-cell'>
        {isEditing ? (
          <>
            <button className='row-action-button save-button' onClick={handleSave} aria-label='Save expense'>
              <MdSave />
            </button>
            <button className='row-action-button cancel-button' onClick={handleCancel} aria-label='Cancel expense edit'>
              <MdClose />
            </button>
          </>
        ) : (
          <>
            <button className='row-action-button edit-button' onClick={() => setIsEditing(true)} aria-label='Edit expense'>
              <MdEdit />
            </button>
            <button className='row-action-button delete-button' onClick={() => onRemove(expense.id)} aria-label='Delete expense'>
              <MdDelete />
            </button>
          </>
        )}
      </td>
    </tr>
  )
}

function BudgetMonth({ categories, projectedExpenses, onAdd, onUpdate, onRemove }) {
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [newExpense, setNewExpense] = useState({ name: '', value: 0, categoryId: 0 })

  const getCategoryForExpense = useCallback((categoryId) => {
    if (categories.length < 1) return null
    const category = categories.find((cat) => cat.id === categoryId)

    return category || null
  }, [categories])

  const { projectedIncome, projectedExpensesTotal } = useMemo(() => {
    return projectedExpenses.reduce((totals, expense) => {
      const category = getCategoryForExpense(expense.categoryId)
      if (category?.isIncome) totals.projectedIncome += expense.value
      else totals.projectedExpensesTotal += expense.value
      return totals
    }, { projectedIncome: 0, projectedExpensesTotal: 0 })
  }, [projectedExpenses, getCategoryForExpense])

  const net = projectedIncome - projectedExpensesTotal

  const handleNewExpenseChange = (field, value) => {
    setNewExpense((prev) => ({
      ...prev,
      [field]: field === 'name' ? value : Number(value) || 0
    }))
  }

  const handleCreateExpense = () => {
    if (newExpense.name.trim() === '' || !newExpense.categoryId) return

    onAdd({ ...newExpense, name: newExpense.name.trim() })
    setNewExpense({ name: '', value: 0, categoryId: 0 })
    setShowNewExpense(false)
  }

  const handleCancelNewExpense = () => {
    setNewExpense({ name: '', value: 0, categoryId: 0 })
    setShowNewExpense(false)
  }

  return (
    <div className='row-container budget-month'>
      <div className='budget-summary-panel'>
        <h4>Summary</h4>
        <div className='summary-line'>
          <span>Projected Income</span>
          <span className='amount-positive'>{formatCurrency(projectedIncome)}</span>
        </div>
        <div className='summary-line'>
          <span>Projected Expenses</span>
          <span className='amount-negative'>{formatCurrency(projectedExpensesTotal)}</span>
        </div>
        <div className='summary-line summary-total'>
          <span>Total</span>
          <span className={net >= 0 ? 'amount-positive' : 'amount-negative'}>
            {formatCurrency(net)}
          </span>
        </div>
      </div>
      <div className='budget-expenses-panel'>
        <div className='row-container budget-expenses-header'>
          <h4>Expenses</h4>
          <button
            className='new-expense-button'
            onClick={() => (showNewExpense ? handleCancelNewExpense() : setShowNewExpense(true))}
          >
            {showNewExpense ? <MdClose /> : <MdAdd />}
            {showNewExpense ? 'Cancel' : 'New Expense'}
          </button>
        </div>
        <div className='projected-expenses'>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Category</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projectedExpenses.length === 0 && !showNewExpense && (
                <tr className='empty-budget-row'>
                  <td colSpan='4'>No projected expenses yet</td>
                </tr>
              )}
              {projectedExpenses.map((pe) => {
                return (
                  <ProjectedExpenseRow
                    key={pe.id}
                    expense={pe}
                    categories={categories}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                  />
                )
              })}
              {showNewExpense && (
                <tr className='new-expense-row'>
                  <td>
                    <input
                      type='text'
                      placeholder='New expense'
                      value={newExpense.name}
                      onChange={({ target }) => handleNewExpenseChange('name', target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateExpense()}
                    />
                  </td>
                  <td>
                    <input
                      type='number'
                      placeholder='0'
                      value={newExpense.value || ''}
                      onChange={({ target }) => handleNewExpenseChange('value', target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateExpense()}
                    />
                  </td>
                  <td>
                    <select
                      value={newExpense.categoryId}
                      onChange={({ target }) => handleNewExpenseChange('categoryId', target.value)}
                    >
                      <option value={0}>Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className='add-expense-button' onClick={handleCreateExpense}>Add</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function BudgetBuilder() {
  const { categories: categoryData, monthlyBudgets: monthlyBudgetData, dateRange } = useAppData()
  const { categories } = categoryData
  const {
    isLoading,
    monthlyBudgets,
    createNewMonthlyBudget,
    addNewProjectedExpense,
    updateProjectedExpense,
    deleteProjectedExpense
  } = monthlyBudgetData
  const { startDate } = dateRange
  const initialBudgetMonth = parseBudgetMonth(startDate)
  const [newBudgetMonth, setNewBudgetMonth] = useState(initialBudgetMonth.month)
  const [newBudgetYear, setNewBudgetYear] = useState(initialBudgetMonth.year)

  return (
    <div className='budget-builder'>
      <h3>Budget</h3>
      {isLoading ? <LoadingSpinner /> : (

        <div style={{ paddingTop: '16px' }}>
          {monthlyBudgets.map((budget, idx) => {
            return (
              <ExpansionPanel
                key={budget.id}
                title={`${MONTH_NAMES[budget.month - 1]} ${budget.year}`}
                defaultExpanded={idx === 0}
              >
                <BudgetMonth
                  categories={categories}
                  projectedExpenses={budget.projectedExpenses || []}
                  onAdd={(expense) => addNewProjectedExpense({ ...expense, monthlyBudgetId: budget.id })}
                  onUpdate={updateProjectedExpense}
                  onRemove={deleteProjectedExpense}
                />
              </ExpansionPanel>
            )
          })}
          {
            monthlyBudgets.length === 0 && (
              <div className='new-budget-form'>
                <div className='new-budget-fields'>
                  <select
                    aria-label='Budget month'
                    value={newBudgetMonth}
                    onChange={({ target }) => setNewBudgetMonth(Number(target.value))}
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option value={idx + 1} key={m}>{m}</option>
                    ))}
                  </select>
                  <input
                    aria-label='Budget year'
                    value={newBudgetYear}
                    onChange={({ target }) => setNewBudgetYear(Number(target.value))}
                    type='number'
                  />
                </div>
                <button
                  className='create-budget-button'
                  onClick={() => createNewMonthlyBudget(newBudgetMonth, newBudgetYear)}
                >
                  Create New Monthly Budget
                </button>
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}
