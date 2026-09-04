import { useMemo, useState } from 'react'
import { MdClose, MdDelete, MdEdit, MdSave } from 'react-icons/md'
import EditableField from '../../shared/EditableField/EditableField'
import ProjectedExpenseSelect from '../../shared/ProjectedExpenseSelect/ProjectedExpenseSelect'
import useAppData from '../../../DataContext/useAppData'
import { formatTransactionDate } from '../../../utilities/dateFormatting'
import './transactionTable.css'

function TransactionRow({ transaction }) {
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
        <EditableField
          type='text'
          value={edited.title}
          setValue={(title) => setEdited({ ...edited, title })}
          editMode={isEditing}
        />
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
          <ProjectedExpenseSelect
            categories={categories}
            projectedExpenses={budgetExpenses}
            value={edited.projectedExpenseId}
            onChange={(projectedExpenseId) => setEdited({ ...edited, projectedExpenseId })}
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

export default function TransactionTable({ transactions }) {
  const {
    categories: { categories },
    projectedExpenses: { projectedExpenses }
  } = useAppData()

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
    <div className='transactions-table-wrapper'>
      <table className='transactions-table'>
        <thead>
          <tr>
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
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
          <tr className='total-row'>
            <td colSpan='2'><strong>Total</strong></td>
            <td className={`amount-cell ${total >= 0 ? 'positive-total' : 'negative-total'}`}>
              <strong>{total >= 0 ? '+' : '-'}${formattedTotal}</strong>
            </td>
            <td colSpan='3'></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
