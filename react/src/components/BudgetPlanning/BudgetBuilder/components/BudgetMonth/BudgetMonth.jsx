import { useMemo } from 'react'
import './budgetMonth.css'
import formatCurrency from '../../../../../utilities/formateCurrency'
import ProjectedExpenses from '../ProjectedExpenses/ProjectedExpenses'
import useAppData from '../../../../../DataContext/useAppData'

export default function BudgetMonth({ monthlyBudgetId }) {
  return (
    <div className='row-container budget-month'>
      <ProjectedExpenses monthlyBudgetId={monthlyBudgetId} />
    </div>
  )
}
