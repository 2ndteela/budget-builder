import { useMemo } from 'react'
import './budgetMonth.css'
import formatCurrency from '../../../../../utilities/formateCurrency'
import ProjectedExpenses from '../ProjectedExpenses/ProjectedExpenses'
import useAppData from '../../../../../DataContext/useAppData'

export default function BudgetMonth({ monthlyBudgetId }) {
  const {
    categories: { categories },
    monthlyBudgets: { monthlyBudgets }
  } = useAppData()

  const projectedExpenses = useMemo(() => {
    const budget = monthlyBudgets.find((item) => item.id === monthlyBudgetId)
    return budget?.projectedExpenses || []
  }, [monthlyBudgets, monthlyBudgetId])

  const { projectedIncome, projectedExpensesTotal } = useMemo(() => {
    const categoryById = new Map(categories.map((category) => [category.id, category]))

    return projectedExpenses.reduce((totals, expense) => {
      const category = categoryById.get(expense.categoryId)
      if (category?.isIncome) totals.projectedIncome += expense.value
      else totals.projectedExpensesTotal += expense.value
      return totals
    }, { projectedIncome: 0, projectedExpensesTotal: 0 })
  }, [projectedExpenses, categories])

  const net = projectedIncome - projectedExpensesTotal

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
      <ProjectedExpenses monthlyBudgetId={monthlyBudgetId} />
    </div>
  )
}
