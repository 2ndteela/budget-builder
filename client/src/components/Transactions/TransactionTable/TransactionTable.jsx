import { useCallback, useMemo, useState } from 'react'
import { MdClose, MdDelete, MdEdit, MdSave } from 'react-icons/md'
import EditableField from '../../shared/EditableField/EditableField'
import WaterfallSelector from '../../shared/WaterfallSelector/WaterfallSelector'
import MatchableText from '../../shared/MatchableText/MatchableText'
import useAppData from '../../../DataContext/useAppData'
import { formatBudgetMonth, formatTransactionDate } from '../../../utilities/dateFormatting'
import buildProjectedExpenseOptions from '../../../utilities/buildProjectedExpenseOptions'
import './transactionTable.css'

function TransactionRow({ transaction, isSelected, onToggleSelected, searchText }) {
  const {
    categories: { categories },
    accounts: { accounts },
    monthlyBudgets: { monthlyBudgets },
    projectedExpenses: { projectedExpenses },
    transactions: { updateTransaction, deleteTransaction }
  } = useAppData()
  const [isEditing, setIsEditing] = useState(false)
  const [edited, setEdited] = useState(transaction)

  const budget = monthlyBudgets.find((item) => item.id === transaction.monthlyBudgetId)
  const expense = projectedExpenses.find((item) => item.id === transaction.projectedExpenseId)
  const category = categories.find((item) => item.id === expense?.categoryId)
  const account = accounts.find((item) => item.id === transaction.accountId)
  // Only the expenses planned for this transaction's month can be matched to it.
  const budgetExpenses = projectedExpenses.filter((item) => item.monthlyBudgetId === transaction.monthlyBudgetId)
  const expenseOptions = useMemo(
    () => buildProjectedExpenseOptions(categories, budgetExpenses),
    [categories, budgetExpenses]
  )

  const save = async () => {
    await updateTransaction({ ...edited, amount: Math.abs(edited.amount) })
    setIsEditing(false)
  }

  const cancel = () => {
    setEdited(transaction)
    setIsEditing(false)
  }

  return (
    <tr className={`color-${category?.color || 'gray'}`}>
      <td className='select-cell'>
        <input
          type='checkbox'
          checked={isSelected}
          onChange={() => onToggleSelected(transaction.id)}
          aria-label={`Select ${transaction.title}`}
        />
      </td>
      <td>
        {isEditing ? (
          <input
            type='number'
            min='1'
            max='31'
            value={edited.date}
            onChange={({ target }) => setEdited({ ...edited, date: Number(target.value) || 1 })}
          />
        ) : formatTransactionDate(transaction.date, budget)}
      </td>
      <td>
        {isEditing ? (
          <input
            type='text'
            value={edited.title}
            onChange={({ target }) => setEdited({ ...edited, title: target.value })}
          />
        ) : (
          <MatchableText value={edited.title} searchText={searchText} />
        )}
      </td>
      <td className='amount-cell'>
        <EditableField
          type='number'
          value={Math.abs(edited.amount)}
          setValue={(amount) => setEdited({ ...edited, amount: Math.abs(amount) })}
          editMode={isEditing}
          formatOptions={{ style: 'currency', currency: 'USD' }}
        />
      </td>
      <td>
        {isEditing ? (
          <WaterfallSelector
            value={expense?.name || 'Unassigned'}
            onChange={(option) => setEdited({ ...edited, projectedExpenseId: option.value })}
            menuOptions={expenseOptions}
          />
        ) : expense?.name || '—'}
      </td>
      <td>
        <EditableField
          type='select'
          value={edited.accountId}
          setValue={(accountId) => setEdited({ ...edited, accountId: Number(accountId) })}
          editMode={isEditing}
          options={accounts.map((item) => ({ value: item.id, label: item.name }))}
          displayValue={account?.name || 'N/A'}
        />
      </td>
      <td className='actions-cell'>
        {isEditing ? (
          <>
            <button className='row-action-button save-button' onClick={save}><MdSave /></button>
            <button className='row-action-button cancel-button' onClick={cancel}><MdClose /></button>
          </>
        ) : (
          <>
            <button className='row-action-button edit-button' onClick={() => setIsEditing(true)}><MdEdit /></button>
            <button
              className='row-action-button delete-button'
              onClick={() => deleteTransaction(transaction.id)}
            >
              <MdDelete />
            </button>
          </>
        )}
      </td>
    </tr>
  )
}

export default function TransactionTable({ transactions, searchText }) {
  const {
    categories: { categories },
    projectedExpenses: { projectedExpenses },
    monthlyBudgets: { monthlyBudgets },
    transactions: { assignTransactions }
  } = useAppData()
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkExpenseId, setBulkExpenseId] = useState(null)

  const toggleSelected = useCallback((id) => {
    setSelectedIds((selected) => selected.includes(id)
      ? selected.filter((value) => value !== id)
      : [...selected, id])
  }, [])

  const selected = useMemo(
    () => transactions.filter((transaction) => selectedIds.includes(transaction.id)),
    [selectedIds, transactions])

  // A transaction's date is a day inside its own month, so a plan from another month would
  // file it under the wrong one. One shared month is what makes a bulk assignment valid.
  const sharedBudgetId = useMemo(() => {
    if (selected.length === 0) return null
    const [first] = selected
    return selected.every((transaction) => transaction.monthlyBudgetId === first.monthlyBudgetId)
      ? first.monthlyBudgetId
      : null
  }, [selected])

  const sharedBudget = monthlyBudgets.find((budget) => budget.id === sharedBudgetId)

  const budgetExpenses = useMemo(
    () => projectedExpenses.filter((expense) => expense.monthlyBudgetId === sharedBudgetId),
    [projectedExpenses, sharedBudgetId])

  const bulkExpenseOptions = useMemo(
    () => buildProjectedExpenseOptions(categories, budgetExpenses),
    [categories, budgetExpenses])

  const bulkExpenseName = useMemo(() => {
    if (!bulkExpenseId) return 'Unassigned'
    const expense = projectedExpenses.find((e) => e.id === bulkExpenseId)
    return expense?.name || 'Unassigned'
  }, [bulkExpenseId, projectedExpenses])

  const clearSelection = () => {
    setSelectedIds([])
    setBulkExpenseId(null)
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) return clearSelection()
    setSelectedIds(transactions.map((transaction) => transaction.id))
  }

  const assignSelected = async () => {
    try {
      await assignTransactions({ transactionIds: selectedIds, projectedExpenseId: bulkExpenseId })
      clearSelection()
    } catch (err) {
      alert('Error assigning transactions')
      console.error(err)
    }
  }

  const total = useMemo(() => {
    const categoryByExpenseId = new Map(projectedExpenses.map((expense) => [
      expense.id,
      categories.find((category) => category.id === expense.categoryId)
    ]))

    return transactions.reduce((sum, transaction) => {
      const category = categoryByExpenseId.get(transaction.projectedExpenseId)
      return sum + (category?.isIncome ? transaction.amount : -transaction.amount)
    }, 0)
  }, [categories, projectedExpenses, transactions])

  const formattedTotal = Math.abs(total).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return (
    <>
      {selectedIds.length > 0 && (
        <div className='bulk-assign-bar'>
          <span className='bulk-assign-count'>{selectedIds.length} selected</span>
          {sharedBudgetId === null ? (
            <span className='bulk-assign-warning'>
              Selection spans several months — a projected expense belongs to one month, so pick
              transactions from a single month to assign them together.
            </span>
          ) : (
            <>
              <WaterfallSelector
                label="Projected Expense"
                value={bulkExpenseName}
                onChange={(option) => setBulkExpenseId(option.value)}
                menuOptions={bulkExpenseOptions}
              />
              <button className='btn-green' onClick={assignSelected}>
                Assign {selectedIds.length} to{' '}
                {sharedBudget ? formatBudgetMonth(sharedBudget) : 'this month'}
              </button>
            </>
          )}
          <button className='btn-gray' onClick={clearSelection}>Clear</button>
        </div>
      )}
      <div className='transactions-table-wrapper'>
        <table className='transactions-table'>
          <thead>
            <tr>
              <th className='select-cell'>
                <input
                  type='checkbox'
                  checked={transactions.length > 0 && selectedIds.length === transactions.length}
                  onChange={toggleSelectAll}
                  aria-label='Select every transaction shown'
                />
              </th>
              <th>Date</th>
              <th>Transaction</th>
              <th>Amount</th>
              <th>Projected Expense</th>
              <th>Account</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                isSelected={selectedIds.includes(transaction.id)}
                onToggleSelected={toggleSelected}
                searchText={searchText}
              />
            ))}
            <tr className='total-row'>
              <td colSpan='3'><strong>Total</strong></td>
              <td className={`amount-cell ${total >= 0 ? 'positive-total' : 'negative-total'}`}>
                <strong>{total >= 0 ? '+' : '-'}${formattedTotal}</strong>
              </td>
              <td colSpan='3'></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
