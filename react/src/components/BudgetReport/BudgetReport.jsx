import React, { useState, useMemo, useCallback } from 'react'
import LoadingSpinner from '../../components/shared/LoadingSpinner/LoadingSpinner'
import useAppData from '../../DataContext/useAppData'
import BurnUpChart from '../BurnUpChart/BurnUpChart'
import buildBudgetAnalysis from './budgetAnalysis'
import './budgetReport.css'
import { BiCaretDown, BiCaretUp } from "react-icons/bi";

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(amount || 0)

const formatDate = (date) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
}).format(date)

function getTotalClass(total) {
  if (total === 0) return ''
  return total >= 0 ? 'income' : 'expense'
}

export default function BudgetReport() {
  const { monthlyBudgets: { loading, monthlyBudgets }, categories: { categories } } = useAppData()
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [sortCondition, setSortCondition] = useState('name')



  const analysis = useMemo(
    () => buildBudgetAnalysis(monthlyBudgets, categories),
    [monthlyBudgets, categories])

  const toggleRow = (categoryId) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const netBalance = analysis.totalIncome - analysis.totalExpense

  const setNewSortCondition = useCallback((newCondition) => {
    if (!sortCondition) setSortCondition(newCondition)
    else if (sortCondition.includes(newCondition)) {
      if (sortCondition.includes('reversed')) setSortCondition(null)
      else setSortCondition(`${newCondition}-reversed`)
    }
    else setSortCondition(newCondition)
  }, [sortCondition])

  const sortedCategories = useMemo(() => {
    const categories = analysis.categories
    if (!sortCondition) return categories

    const sorted = [...categories]

    if (sortCondition.includes('name')) sorted.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortCondition.includes('value')) sorted.sort((a, b) => a.transactionTotal - b.transactionTotal)
    else if (sortCondition.includes('difference')) {
      sorted.sort((a, b) => {
        const diffA = a.isIncome ? a.transactionTotal - a.projectedTotal : a.projectedTotal - a.transactionTotal
        const diffB = b.isIncome ? b.transactionTotal - b.projectedTotal : b.projectedTotal - b.transactionTotal
        return diffA - diffB
      })
    }

    if (sortCondition.includes('reversed')) sorted.reverse()
    return sorted
  }, [analysis, sortCondition])

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

      <BurnUpChart dataPoints={analysis.burnUpPoints} />

      <table className="budget-table">
        <thead>
          <tr>
            <th></th>
            <th className="sortable" onClick={() => setNewSortCondition('name')} >
              Category {sortCondition?.includes('name') && <BiCaretDown style={{ transform: sortCondition.includes('reversed') ? 'rotate(180deg)' : 'none' }} />}
            </th>
            <th>Projected</th>
            <th className="sortable" onClick={() => setNewSortCondition('value')} >
              Actual {sortCondition?.includes('value') && <BiCaretDown style={{ transform: sortCondition.includes('reversed') ? 'rotate(180deg)' : 'none' }} />}
            </th>
            <th className="sortable" onClick={() => setNewSortCondition('difference')} >
              Difference {sortCondition?.includes('difference') && <BiCaretDown style={{ transform: sortCondition.includes('reversed') ? 'rotate(180deg)' : 'none' }} />}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedCategories.map(category => {
            const isExpanded = expandedRows.has(category.id)
            const difference = category.isIncome
              ? category.transactionTotal - category.projectedTotal
              : category.projectedTotal - category.transactionTotal

            return (
              <React.Fragment key={category.id}>
                <tr
                  className={`category-row color-${category.color || 'gray'}`}
                  onClick={() => toggleRow(category.id)}
                >
                  <td className="expand-icon">
                    {isExpanded ? <BiCaretDown /> : <BiCaretUp />}
                  </td>
                  <td>
                    {category.name}
                  </td>
                  <td>{formatCurrency(category.projectedTotal)}</td>
                  <td>{formatCurrency(category.transactionTotal)}</td>
                  <td className={getTotalClass(difference)}>
                    {formatCurrency(difference)}
                  </td>
                </tr>

                {isExpanded && category.projectedExpenses.map(pe => {
                  const peDifference = category.isIncome
                    ? pe.transactionTotal - pe.value
                    : pe.value - pe.transactionTotal

                  return (
                    <React.Fragment key={`pe-${pe.id}`}>
                      <tr className="detail-row projected-expense-row">
                        <td></td>
                        <td>
                          {pe.name}
                          {pe.monthLabel && <span className="month-tag">{pe.monthLabel}</span>}
                        </td>
                        <td>{formatCurrency(pe.value)}</td>
                        <td>{formatCurrency(pe.transactionTotal)}</td>
                        <td className={getTotalClass(peDifference)}>
                          {formatCurrency(peDifference)}
                        </td>
                      </tr>
                      {pe.transactionGroups.map(group => {
                        const groupKey = `${pe.id}::${group.key}`
                        const isGroupExpanded = expandedGroups.has(groupKey)
                        // One charge is already its own breakdown, so it does not expand
                        const isRepeated = group.transactions.length > 1

                        return (
                          <React.Fragment key={groupKey}>
                            <tr
                              className={`detail-row transaction-nested${isRepeated ? ' transaction-group-row' : ''}`}
                              onClick={isRepeated ? () => toggleGroup(groupKey) : undefined}
                            >
                              <td></td>
                              <td className="nested-indent">
                                <span className="group-caret">
                                  {isRepeated ? (isGroupExpanded ? '▼' : '▶') : ''}
                                </span>
                                {group.title}
                                {isRepeated && <span className="group-count">×{group.transactions.length}</span>}
                              </td>
                              <td></td>
                              <td>{formatCurrency(group.total)}</td>
                              <td></td>
                            </tr>

                            {isRepeated && isGroupExpanded && group.transactions.map(txn => (
                              <tr key={`txn-${txn.id}`} className="detail-row transaction-nested">
                                <td></td>
                                <td className="nested-indent-deep">{formatDate(txn.occurredOn)}</td>
                                <td></td>
                                <td>{formatCurrency(txn.amount)}</td>
                                <td></td>
                              </tr>
                            ))}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
