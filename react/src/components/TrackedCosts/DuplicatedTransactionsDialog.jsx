import { useState, useCallback, useEffect } from 'react'
import useTransactions from '../../hooks/useTransactions'

export default function DuplicatedTransactionsDialog({
  inDatabaseTransactions,
  newTransactions,
  onClose
}) {
  const [processedTransactions, setProcessedTransactions] = useState(0)
  const { addTransaction, addTransactionsBulk } = useTransactions()

  const remainingTransactions = newTransactions.length - processedTransactions
  const currentNewTransaction = newTransactions[processedTransactions]
  const currentDBTransaction = inDatabaseTransactions.find(
    (t) => t.bankTransactionId === currentNewTransaction?.bankTransactionId
  )

  const acceptTransaction = useCallback(async () => {
    const transactionWithoutId = { ...currentNewTransaction }
    delete transactionWithoutId.id
    await addTransaction(transactionWithoutId)
    setProcessedTransactions((v) => v + 1)
  }, [currentNewTransaction, addTransaction])

  const rejectTransaction = useCallback(() => {
    setProcessedTransactions((v) => v + 1)
  }, [])

  const cancelUpload = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    if (processedTransactions === newTransactions.length) {
      onClose()
    }
  }, [newTransactions.length, processedTransactions, onClose, addTransactionsBulk])

  if (!currentNewTransaction || !currentDBTransaction) return null

  return (
    <div className="csv-mapping-overlay">
      <div className="csv-mapping-dialog">
        <h2>Resolve Conflicts ({remainingTransactions} to review)</h2>

        <div className="mapping-section">
          <h3>New Transaction (CSV)</h3>
          <div className="mapping-grid">
            <div className="mapping-row">
              <label>Title:</label>
              <span>{currentNewTransaction.title}</span>
            </div>
            <div className="mapping-row">
              <label>Amount:</label>
              <span>${Math.abs(currentNewTransaction.amount).toFixed(2)}</span>
            </div>
            <div className="mapping-row">
              <label>Date:</label>
              <span>{new Date(currentNewTransaction.date).toLocaleDateString()}</span>
            </div>
            <div className="mapping-row">
              <label>Category:</label>
              <span>{currentNewTransaction.category}</span>
            </div>
            <div className="mapping-row">
              <label>Bank ID:</label>
              <span>{currentNewTransaction.bankTransactionId}</span>
            </div>
          </div>
        </div>

        <div className="mapping-section">
          <h3>Existing Transaction (Database)</h3>
          <div className="mapping-grid">
            <div className="mapping-row">
              <label>Title:</label>
              <span>{currentDBTransaction.title}</span>
            </div>
            <div className="mapping-row">
              <label>Amount:</label>
              <span>${Math.abs(currentDBTransaction.amount).toFixed(2)}</span>
            </div>
            <div className="mapping-row">
              <label>Date:</label>
              <span>{new Date(currentDBTransaction.date).toLocaleDateString()}</span>
            </div>
            <div className="mapping-row">
              <label>Category:</label>
              <span>{currentDBTransaction.category}</span>
            </div>
            <div className="mapping-row">
              <label>Bank ID:</label>
              <span>{currentDBTransaction.bankTransactionId}</span>
            </div>
          </div>
        </div>

        <div className="csv-mapping-buttons">
          <button onClick={cancelUpload}>Reject All</button>
          <button onClick={rejectTransaction}>Reject</button>
          <button onClick={acceptTransaction}>Accept</button>
        </div>
      </div>
    </div>
  )
}
