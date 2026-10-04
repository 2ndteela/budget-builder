import React, { useState, useMemo, useCallback } from 'react'
import { BiCaretDown, BiCaretUp } from 'react-icons/bi'
import './categoryTable.css'

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

/**
 * Projected vs. actual per category. Rows expand into their projected expenses, then into
 * the transactions booked against each.
 *
 * @param {categories} array of categories from buildBudgetAnalysis
 */
export default function CategoryTable({ categories = [] }) {
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [sortCondition, setSortCondition] = useState('name')

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

  const setNewSortCondition = useCallback((newCondition) => {
    if (!sortCondition) setSortCondition(newCondition)
    else if (sortCondition.includes(newCondition)) {
      if (sortCondition.includes('reversed')) setSortCondition(null)
      else setSortCondition(`${newCondition}-reversed`)
    }
    else setSortCondition(newCondition)
  }, [sortCondition])

  const sortedCategories = useMemo(() => {
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
  }, [categories, sortCondition])

  return (
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
  )
}
