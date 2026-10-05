import { useCallback, useMemo, useState } from 'react'
import { MdClose, MdDelete, MdEdit, MdSave } from 'react-icons/md'
import EditableField from '../../shared/EditableField/EditableField'
import WaterfallSelector from '../../shared/WaterfallSelector/WaterfallSelector'
import MatchableText from '../../shared/MatchableText/MatchableText'
import useAppData from '../../../DataContext/useAppData'
import { formatTransactionDate } from '../../../utilities/dateFormatting'
import buildProjectedExpenseOptions from '../../../utilities/buildProjectedExpenseOptions'
import NewProjectedExpenseDialog from './NewProjectedExpenseDialog'
import './transactionTable.css'

function TransactionRow({ transaction, isSelected, onToggleSelected, searchText, selectedBudgetId }) {
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
  const editedExpense = projectedExpenses.find((item) => item.id === edited.projectedExpenseId)
  const account = accounts.find((item) => item.id === transaction.accountId)
  // Only the expenses planned for this transaction's month can be matched to it.
  const budgetExpenses = projectedExpenses.filter((item) => item.monthlyBudgetId === transaction.monthlyBudgetId)
  const expenseOptions = useMemo(
    () => buildProjectedExpenseOptions(categories, budgetExpenses),
    [categories, budgetExpenses]
  )

  // Start from the latest saved row; a bulk assign may have changed it since the last edit
  const startEditing = () => {
    setEdited(transaction)
    setIsEditing(true)
  }

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
          disabled={selectedBudgetId != null && selectedBudgetId !== transaction.monthlyBudgetId}
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
            value={editedExpense?.name || 'Unassigned'}
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
            <button className='row-action-button edit-button' onClick={startEditing}><MdEdit /></button>
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
  const [showNewExpense, setShowNewExpense] = useState(false)

  const toggleSelected = useCallback((id) => {
    setSelectedIds((selected) => selected.includes(id)
      ? selected.filter((value) => value !== id)
      : [...selected, id])
  }, [])

  const selected = useMemo(
    () => transactions.filter((transaction) => selectedIds.includes(transaction.id)),
    [selectedIds, transactions])

  // A transaction's date is a day inside its own month, so a plan from another month would
  // file it under the wrong one. The first pick locks the selection to its month.
  const selectedBudgetId = useMemo(() => {
    if (selectedIds.length === 0) return null
    return transactions.find((transaction) => transaction.id === selectedIds[0])?.monthlyBudgetId ?? null
  }, [selectedIds, transactions])

  const selectedBudget = monthlyBudgets.find((budget) => budget.id === selectedBudgetId)

  // Select all only reaches the locked month, or the first row's month when nothing is picked yet
  const selectableTransactions = useMemo(() => {
    const budgetId = selectedBudgetId ?? transactions[0]?.monthlyBudgetId
    return transactions.filter((transaction) => transaction.monthlyBudgetId === budgetId)
  }, [selectedBudgetId, transactions])

  const budgetExpenses = useMemo(
    () => projectedExpenses.filter((expense) => expense.monthlyBudgetId === selectedBudgetId),
    [projectedExpenses, selectedBudgetId])

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

  const allSelected = selectableTransactions.length > 0
    && selectableTransactions.every((transaction) => selectedIds.includes(transaction.id))

  const toggleSelectAll = () => {
    if (allSelected) return clearSelection()
    // Keep the click order so the first pick still decides the month
    const additions = selectableTransactions
      .map((transaction) => transaction.id)
      .filter((id) => !selectedIds.includes(id))
    setSelectedIds([...selectedIds, ...additions])
  }

  const closeNewExpense = () => setShowNewExpense(false)

  const newExpenseSaved = () => {
    setShowNewExpense(false)
    clearSelection()
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
          <WaterfallSelector
            label="Projected Expense"
            value={bulkExpenseName}
            onChange={(option) => setBulkExpenseId(option.value)}
            menuOptions={bulkExpenseOptions}
          />
          <button onClick={() => setShowNewExpense(true)}>New Projected Expense</button>
          <button className='btn-green assign-button' onClick={assignSelected}>
            Assign {selectedIds.length}
          </button>
          <button className='btn-gray cancel-button' onClick={clearSelection}>Clear</button>
        </div>
      )}
      {showNewExpense && (
        <NewProjectedExpenseDialog
          transactions={selected}
          budget={selectedBudget}
          onSaved={newExpenseSaved}
          onClose={closeNewExpense}
        />
      )}
      <div className='transactions-table-wrapper'>
        <table className='transactions-table'>
          <thead>
            <tr>
              <th className='select-cell'>
                <input
                  type='checkbox'
                  checked={allSelected}
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
                selectedBudgetId={selectedBudgetId}
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
