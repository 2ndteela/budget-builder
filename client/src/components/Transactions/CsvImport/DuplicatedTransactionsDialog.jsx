import { useCallback, useEffect, useMemo, useState } from 'react'
import useAppData from '../../../DataContext/useAppData'
import { formatTransactionDate } from '../../../utilities/dateFormatting'
import './csvImport.css'

function TransactionSummary({ title, transaction, monthlyBudgets, projectedExpenses }) {
  const budget = monthlyBudgets.find((item) => item.id === transaction.monthlyBudgetId)
  const expense = projectedExpenses.find((item) => item.id === transaction.projectedExpenseId)

  return (
    <div className='mapping-section'>
      <h3>{title}</h3>
      <div className='mapping-grid'>
        <div className='mapping-row'>
          <label>Title:</label>
          <span>{transaction.title}</span>
        </div>
        <div className='mapping-row'>
          <label>Amount:</label>
          <span>${Math.abs(transaction.amount).toFixed(2)}</span>
        </div>
        <div className='mapping-row'>
          <label>Date:</label>
          <span>{formatTransactionDate(transaction.date, budget)}</span>
        </div>
        <div className='mapping-row'>
          <label>Projected Expense:</label>
          <span>{expense?.name || 'Unmatched'}</span>
        </div>
        <div className='mapping-row'>
          <label>Bank ID:</label>
          <span>{transaction.bankTransactionId}</span>
        </div>
      </div>
    </div>
  )
}

export default function DuplicatedTransactionsDialog({ inDatabaseTransactions, newTransactions, onClose }) {
  const [resolvedCount, setResolvedCount] = useState(0)
  const {
    monthlyBudgets: { monthlyBudgets },
    projectedExpenses: { projectedExpenses },
    transactions: { addTransaction }
  } = useAppData()

  // A duplicate with no counterpart in the database has nothing to compare against, so
  // pairing up front keeps the dialog from stalling on a row it cannot render.
  const conflicts = useMemo(() => newTransactions
    .map((incoming) => ({
      incoming,
      existing: inDatabaseTransactions.find((item) => item.bankTransactionId === incoming.bankTransactionId)
    }))
    .filter((conflict) => conflict.existing), [inDatabaseTransactions, newTransactions])

  const conflict = conflicts[resolvedCount]
  const remaining = conflicts.length - resolvedCount

  const acceptTransaction = useCallback(async () => {
    const transaction = { ...conflict.incoming }
    delete transaction.id
    await addTransaction(transaction)
    setResolvedCount((count) => count + 1)
  }, [conflict, addTransaction])

  const rejectTransaction = useCallback(() => setResolvedCount((count) => count + 1), [])

  useEffect(() => {
    if (resolvedCount >= conflicts.length) onClose()
  }, [conflicts.length, resolvedCount, onClose])

  if (!conflict) return null

  return (
    <div className='csv-mapping-overlay'>
      <div className='csv-mapping-dialog'>
        <h2>Resolve Conflicts ({remaining} to review)</h2>

        <TransactionSummary
          title='New Transaction (CSV)'
          transaction={conflict.incoming}
          monthlyBudgets={monthlyBudgets}
          projectedExpenses={projectedExpenses}
        />
        <TransactionSummary
          title='Existing Transaction (Database)'
          transaction={conflict.existing}
          monthlyBudgets={monthlyBudgets}
          projectedExpenses={projectedExpenses}
        />

        <div className='csv-mapping-buttons'>
          <button onClick={acceptTransaction}>Accept</button>
          <button onClick={rejectTransaction}>Reject</button>
          <button onClick={onClose}>Reject All</button>
        </div>
      </div>
    </div>
  )
}
