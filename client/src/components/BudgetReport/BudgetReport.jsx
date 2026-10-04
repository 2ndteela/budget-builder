import { useMemo } from 'react'
import LoadingSpinner from '../../components/shared/LoadingSpinner/LoadingSpinner'
import useAppData from '../../DataContext/useAppData'
import BurnUpChart from '../BurnUpChart/BurnUpChart'
import buildBudgetAnalysis from './budgetAnalysis'
import './budgetReport.css'
import BreakDownChart from '../BreakDownChart/BreakDownChart'
import Tabs from '../Tabs/Tabs'
import CategoryTable from '../CategoryTable/CategoryTable'

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(amount || 0)

function getTotalClass(total) {
  if (total === 0) return ''
  return total >= 0 ? 'income' : 'expense'
}

export default function BudgetReport() {
  const { monthlyBudgets: { loading, monthlyBudgets }, categories: { categories } } = useAppData()

  const analysis = useMemo(
    () => buildBudgetAnalysis(monthlyBudgets, categories),
    [monthlyBudgets, categories])

  const netBalance = analysis.totalIncome - analysis.totalExpense

  if (loading) return <LoadingSpinner />

  if (monthlyBudgets.length === 0) {
    return (
      <div className="budget-report">
        <p className="budget-report-empty">
          No monthly budgets in this date range. Create one in Planning and Management to see the analysis.
        </p>
      </div>
    )
  }


  const projectedBalance = analysis.projectedTotalIncome - analysis.projectedExpense

  return (
    <div className="budget-report">
      <div className="budget-summary">
        <div style={{ width: '100%' }}>
          <h2>Net Balance Summary</h2>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Projected</th>
                <th>Actual</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Income</td>
                <td>{formatCurrency(analysis.projectedTotalIncome)}</td>
                <td>{formatCurrency(analysis.totalIncome)}</td>
              </tr>
              <tr>
                <td>Expense</td>
                <td>{formatCurrency(analysis.projectedExpense)}</td>
                <td>{formatCurrency(analysis.totalExpense)}</td>
              </tr>
              <tr>
                <td>Balance</td>
                <td className={getTotalClass(projectedBalance)}>
                  {formatCurrency(projectedBalance)}
                </td>
                <td className={getTotalClass(netBalance)}>
                  {formatCurrency(netBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Tabs tabs={[
        {
          title: 'Burn Up',
          key: 'burn-up',
          children: (<BurnUpChart dataPoints={analysis.burnUpPoints} />)
        },
        {
          title: 'Break Down',
          key: 'break-down',
          children: (<BreakDownChart categories={analysis.categories} />)
        },
        {
          title: 'Categories',
          key: 'categories',
          children: (<CategoryTable categories={analysis.categories} />)
        }
      ]} />
    </div>
  )
}
