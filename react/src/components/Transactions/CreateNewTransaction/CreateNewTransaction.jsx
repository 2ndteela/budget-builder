import { useState } from 'react'
import useAppData from '../../../DataContext/useAppData'
import ProjectedExpenseSelect from '../../shared/ProjectedExpenseSelect/ProjectedExpenseSelect'
import { formatBudgetMonth } from '../../../utilities/dateFormatting'
import './createNewTransaction.css'
import CompressedButton from '../../shared/CompressedButton/CompressedButton'
import { MdAdd } from 'react-icons/md'

const createDefaultTransaction = (accounts, monthlyBudgets) => {
  const now = new Date()
  const currentBudget = monthlyBudgets.find((budget) =>
    budget.month === now.getMonth() + 1 && budget.year === now.getFullYear())

  return {
    title: '',
    amount: 0,
    projectedExpenseId: null,
    accountId: accounts[0]?.id || 1,
    monthlyBudgetId: currentBudget?.id || monthlyBudgets[0]?.id || null,
    // The transaction only stores a day; the monthly budget above supplies the month and year.
    date: now.getDate()
  }
}

export default function CreateNewTransaction() {
  const {
    accounts: { accounts },
    categories: { categories },
    monthlyBudgets: { monthlyBudgets },
    projectedExpenses: { projectedExpenses },
    transactions: { addTransaction }
  } = useAppData()
  const [isOpen, setIsOpen] = useState(false)
  const [transaction, setTransaction] = useState(() => createDefaultTransaction(accounts, monthlyBudgets))

  const budgetExpenses = projectedExpenses.filter((expense) => expense.monthlyBudgetId === transaction.monthlyBudgetId)

  const update = (field, value) => setTransaction({ ...transaction, [field]: value })

  const close = () => {
    setTransaction(createDefaultTransaction(accounts, monthlyBudgets))
    setIsOpen(false)
  }

  const create = async () => {
    if (!transaction.title.trim() || !transaction.amount || !transaction.monthlyBudgetId) return

    await addTransaction({
      bankTransactionId: null,
      title: transaction.title.trim(),
      amount: Math.abs(transaction.amount),
      projectedExpenseId: transaction.projectedExpenseId,
      monthlyBudgetId: transaction.monthlyBudgetId,
      date: transaction.date,
      accountId: transaction.accountId
    })
    close()
  }

  return (
    <div className='new-transaction-wrapper'>
      <CompressedButton Icon={MdAdd} id='new-transaction-button' onClick={() => setIsOpen(!isOpen)}>Add Transaction</CompressedButton>
      {isOpen && (
        <div className='new-transaction-menu'>
          <input
            type='text'
            placeholder='Transaction title'
            value={transaction.title}
            onChange={({ target }) => update('title', target.value)}
          />
          <input
            type='number'
            placeholder='Amount'
            value={transaction.amount || ''}
            onChange={({ target }) => update('amount', Number(target.value))}
          />
          {monthlyBudgets.length === 0 ? (
            <span className='new-transaction-hint'>Create a monthly budget before adding transactions.</span>
          ) : (
            <div className='date-inputs'>
              <select
                value={transaction.monthlyBudgetId || ''}
                onChange={({ target }) => setTransaction({
                  ...transaction,
                  monthlyBudgetId: Number(target.value),
                  // Projected expenses belong to one month, so a month change clears the match.
                  projectedExpenseId: null
                })}
              >
                {monthlyBudgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>{formatBudgetMonth(budget)}</option>
                ))}
              </select>
              <input
                type='number'
                placeholder='Day'
                min='1'
                max='31'
                value={transaction.date}
                onChange={({ target }) => update('date', Number(target.value) || 1)}
              />
            </div>
          )}
          <ProjectedExpenseSelect
            categories={categories}
            projectedExpenses={budgetExpenses}
            value={transaction.projectedExpenseId}
            onChange={(value) => update('projectedExpenseId', value)}
          />
          <select
            value={transaction.accountId}
            onChange={({ target }) => update('accountId', Number(target.value))}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <div className='new-transaction-buttons'>
            <button onClick={create}>Create</button>
            <button className='btn-gray' onClick={close}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
