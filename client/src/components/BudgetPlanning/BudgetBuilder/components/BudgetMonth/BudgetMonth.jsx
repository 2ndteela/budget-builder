import './budgetMonth.css'
import ProjectedExpenses from '../ProjectedExpenses/ProjectedExpenses'

export default function BudgetMonth({ monthlyBudgetId }) {
  return (
    <div className='row-container budget-month'>
      <ProjectedExpenses monthlyBudgetId={monthlyBudgetId} />
    </div>
  )
}
