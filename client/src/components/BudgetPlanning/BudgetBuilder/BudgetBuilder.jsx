import { useCallback, useMemo, useState } from 'react'
import ExpansionPanel from '../../shared/ExpansionPanel/ExpansionPanel'
import './budgetBuilder.css'
import useAppData from '../../../DataContext/useAppData'
import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner'
import BudgetMonth from './components/BudgetMonth/BudgetMonth'
import EditableField from '../../shared/EditableField/EditableField'
import formatCurrency from '../../../utilities/formateCurrency'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function parseBudgetMonth(startDate) {
  const [year, month] = startDate?.split('-').map(Number) || []
  const now = new Date()

  return year && month >= 1 && month <= 12
    ? { year, month }
    : { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default function BudgetBuilder() {
  const {
    monthlyBudgets: { loading, monthlyBudgets, createNewMonthlyBudget },
    dateRange: { startDate },
    categories: categoryData
  } = useAppData()

  const getExpenseSummary = useCallback((b) => {
    const { categories } = categoryData
    const { projectedExpenses } = b
    const categoryById = new Map(categories.map((category) => [category.id, category]))

    return projectedExpenses.reduce((totals, expense) => {
      const category = categoryById.get(expense.categoryId)
      if (category?.isIncome) totals.projectedIncome += expense.value
      else totals.projectedExpensesTotal += expense.value
      return totals
    }, { projectedIncome: 0, projectedExpensesTotal: 0 })
  }, [categoryData])

  const initialBudgetMonth = parseBudgetMonth(startDate)
  const [newBudgetMonth, setNewBudgetMonth] = useState(initialBudgetMonth.month)
  const [newBudgetYear, setNewBudgetYear] = useState(initialBudgetMonth.year)

  const handleCreateBudget = async () => {
    try {
      await createNewMonthlyBudget(newBudgetMonth, newBudgetYear)
    } catch (err) {
      alert('Error creating monthly budget')
      console.error(err)
    }
  }

  return (
    <div className='budget-builder'>
      <h3>Budget</h3>
      {loading ? <LoadingSpinner /> : (

        <div style={{ paddingTop: '16px' }}>
          {monthlyBudgets.length > 0 && (
            <div className="budget-table-header">
              <div className="budget-month-col">Month</div>
              <div className="budget-value-col">Income</div>
              <div className="budget-value-col">Expense</div>
              <div className="budget-value-col">Balance</div>
            </div>
          )}
          {monthlyBudgets.map((budget, idx) => {
            const summary = getExpenseSummary(budget)
            const balance = summary.projectedIncome - summary.projectedExpensesTotal
            const balanceClass = balance === 0 ? '' : balance > 0 ? 'positive' : 'negative'
            return (
              <ExpansionPanel
                key={budget.id}
                title={(
                  <div className="budget-row-summary">
                    <div className="budget-month-col">{`${MONTH_NAMES[budget.month - 1]} ${budget.year}`}</div>
                    <div className="budget-value-col">{formatCurrency(summary.projectedIncome)}</div>
                    <div className="budget-value-col">{formatCurrency(summary.projectedExpensesTotal)}</div>
                    <div className={`budget-value-col ${balanceClass}`}>{formatCurrency(balance)}</div>
                  </div>
                )}
                defaultExpanded={idx === 0}
              >
                <BudgetMonth monthlyBudgetId={budget.id} />
              </ExpansionPanel>
            )
          })}
          {
            monthlyBudgets.length === 0 && (
              <div className='new-budget-form'>
                <div className='new-budget-fields'>
                  <EditableField
                    type='select'
                    editMode
                    value={newBudgetMonth}
                    setValue={(month) => setNewBudgetMonth(Number(month))}
                    options={MONTH_NAMES.map((m, idx) => ({ value: idx + 1, label: m }))}
                  />
                  <EditableField
                    type='number'
                    editMode
                    value={newBudgetYear}
                    setValue={setNewBudgetYear}
                  />
                </div>
                <button
                  className='create-budget-button'
                  onClick={handleCreateBudget}
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
