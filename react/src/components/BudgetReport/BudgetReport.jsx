import React, { useState, useMemo, useCallback } from 'react'
import LoadingSpinner from '../../components/shared/LoadingSpinner/LoadingSpinner'
import useBudget from '../../hooks/useBudget'
import './budgetReport.css'
import { BiCaretDown } from "react-icons/bi";

export default function BudgetReport() {
  const { loading, budget } = useBudget()
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [sortCondition, setSortCondition] = useState('name')

  const toggleRow = (categoryId) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  function getTotalClass(total) {
    if (total === 0) return ''
    return total >= 0 ? 'income' : 'expense'
  }
  const netBalance = (budget?.totalIncome || 0) - (budget?.totalExpense || 0)

  const setNewSortCondition = useCallback((newCondition) => {
    if (!sortCondition) setSortCondition(newCondition)
    else if (sortCondition.includes(newCondition)) {
      if (sortCondition.includes('reversed')) setSortCondition(null)
      else setSortCondition(`${newCondition}-reversed`)
    }
    else setSortCondition(newCondition)
  }, [sortCondition])

  const sortedCategories = useMemo(() => {
    const categories = budget?.categories || []
    if (!sortCondition) return categories

    const sorted = [...categories]

    if (sortCondition.includes('name')) {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortCondition.includes('value')) {
      sorted.sort((a, b) => a.transactionTotal - b.transactionTotal)
    } else if (sortCondition.includes('difference')) {
      sorted.sort((a, b) => {
        const diffA = a.isIncome ? a.transactionTotal - a.projectedTotal : a.projectedTotal - a.transactionTotal
        const diffB = b.isIncome ? b.transactionTotal - b.projectedTotal : b.projectedTotal - b.transactionTotal
        return diffA - diffB
      })
    }

    if (sortCondition.includes('reversed')) sorted.reverse()
    return sorted
  }, [budget, sortCondition])

  return loading ? <LoadingSpinner /> : (
    <div className="budget-report">
      <div className="budget-summary">
        <div className="summary-item">
          <span>Total Income:</span>
          <span className="income">{formatCurrency(budget?.totalIncome || 0)}</span>
        </div>
        <div className="summary-item">
          <span>Projected Expenses:</span>
          <span className="projection">{formatCurrency(budget?.projectedExpense || 0)}</span>
        </div>
        <div className="summary-item">
          <span>Total Expense:</span>
          <span className="expense">{formatCurrency(budget?.totalExpense || 0)}</span>
        </div>
        <div className="summary-item">
          <span>Net Balance:</span>
          <span className={netBalance >= 0 ? 'income' : 'expense'}>
            {formatCurrency(netBalance)}
          </span>
        </div>
      </div>

      <table className="budget-table">
        <thead>
          <tr>
            <th></th>
            <th className="sortable" onClick={() => setNewSortCondition('name')} >
              Category {sortCondition?.includes('name') && <BiCaretDown style={{transform: sortCondition.includes('reversed') ? 'rotate(180deg)' : 'none'}} />}
            </th>
            <th>Projected</th>
            <th className="sortable" onClick={() => setNewSortCondition('value')} >
              Actual {sortCondition?.includes('value') && <BiCaretDown style={{transform: sortCondition.includes('reversed') ? 'rotate(180deg)' : 'none'}} />}
            </th>
            <th className="sortable" onClick={() => setNewSortCondition('difference')} >
              Difference {sortCondition?.includes('difference') && <BiCaretDown style={{transform: sortCondition.includes('reversed') ? 'rotate(180deg)' : 'none'}} />}
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
                  key={category.id}
                  className="category-row"
                  onClick={() => toggleRow(category.id)}
                >
                  <td className="expand-icon">
                    {isExpanded ? '▼' : '▶'}
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

                {isExpanded && (
                  <>
                    {category.projectedExpenses?.length > 0 && (
                      <>
                        <tr className="detail-header">
                          <td></td>
                          <td colSpan="4">Projected Expenses</td>
                        </tr>
                        {category.projectedExpenses.map(pe => (
                          <tr key={`pe-${pe.id}`} className="detail-row">
                            <td></td>
                            <td>{pe.name}</td>
                            <td>{formatCurrency(pe.value)}</td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}
                      </>
                    )}

                    {category.transactions?.length > 0 && (
                      <>
                        <tr className="detail-header">
                          <td></td>
                          <td colSpan="4">Transactions</td>
                        </tr>
                        {category.transactions.map(txn => (
                          <tr key={`txn-${txn.id}`} className="detail-row">
                            <td></td>
                            <td>{txn.title}</td>
                            <td></td>
                            <td>{formatCurrency(txn.amount)}</td>
                            <td></td>
                          </tr>
                        ))}
                      </>
                    )}
                  </>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
