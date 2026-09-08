import { useState } from 'react'
import ExpansionPanel from '../../shared/ExpansionPanel/ExpansionPanel'
import './budgetBuilder.css'
import useAppData from '../../../DataContext/useAppData'
import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner'
import BudgetMonth from './components/BudgetMonth/BudgetMonth'
import EditableField from '../../shared/EditableField/EditableField'

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
    dateRange: { startDate }
  } = useAppData()
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
          {monthlyBudgets.map((budget, idx) => {
            return (
              <ExpansionPanel
                key={budget.id}
                title={`${MONTH_NAMES[budget.month - 1]} ${budget.year}`}
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
