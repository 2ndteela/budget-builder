import { useState, useMemo } from 'react'
import './trackedCosts.css'
import CategoryChip from '../shared/CategoryChip/CategoryChip'
import CsvUpload from './CsvUpload'
import DuplicatedTransactionsDialog from './DuplicatedTransactionsDialog'
import { MdEdit, MdSave, MdDelete, MdClose } from 'react-icons/md';
import EditableField from '../shared/EditableField/EditableField';
import useCategories from '../../hooks/useCategories';
import useAccounts from '../../hooks/useAccounts';
import useTransactions from '../../hooks/useTransactions'
import LoadingSpinner from '../shared/LoadingSpinner/LoadingSpinner'

const UNASSIGNED = 0

function TransactionRow({ txn, onUpdate, onDelete, categories }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTxn, setEditedTxn] = useState(txn);
  const { accounts } = useAccounts()

  const editedCategory = categories.find((c) => c.id === editedTxn.categoryId)
  const subCategoryOptions = editedCategory?.projectedExpenses || []

  const matchedCategory = categories.find((c) => c.id === txn.categoryId)
  const matchedSubCategory = txn.projectedExpenseId
    ? matchedCategory?.projectedExpenses?.find((pe) => pe.id === txn.projectedExpenseId)
    : null

  // Changing category clears the subcategory — expenses belong to one category.
  const handleCategorySelect = (value) => {
    setEditedTxn({ ...editedTxn, categoryId: Number(value), projectedExpenseId: null })
  }

  const handleSubCategorySelect = (value) => {
    setEditedTxn({ ...editedTxn, projectedExpenseId: Number(value) || null })
  }

  const handleSave = () => {
    const savedTxn = {
      ...editedTxn,
      amount: Math.abs(editedTxn.amount)
    }
    onUpdate(savedTxn);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTxn(txn);
    setIsEditing(false);
  };

  const matchedAccount = accounts.find((acc) => txn.accountId === acc.id)

  return (
    <tr className={`color-${matchedCategory?.color || 'gray'}`}>
      <td>
        <EditableField
          type="date"
          value={editedTxn.date}
          setValue={(value) => setEditedTxn({ ...editedTxn, date: value })}
          editMode={isEditing}
        />
      </td>
      <td>
        <EditableField
          type="text"
          value={editedTxn.title}
          setValue={(value) => setEditedTxn({ ...editedTxn, title: value })}
          editMode={isEditing}
        />
      </td>
      <td className="amount-cell">
        <EditableField
          type="number"
          value={Math.abs(editedTxn.amount)}
          setValue={(value) => setEditedTxn({ ...editedTxn, amount: Math.abs(value) })}
          editMode={isEditing}
          formatOptions={{ style: 'currency', currency: 'USD' }}
        />
      </td>
      <td>
        <EditableField
          type="select"
          value={editedTxn.categoryId || UNASSIGNED}
          setValue={handleCategorySelect}
          editMode={isEditing}
          options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
          displayValue={matchedCategory?.name || 'Unassigned'}
        />
      </td>
      <td>
        <EditableField
          type="select"
          value={editedTxn.projectedExpenseId || UNASSIGNED}
          setValue={handleSubCategorySelect}
          editMode={isEditing}
          options={[
            { value: UNASSIGNED, label: 'None' },
            ...subCategoryOptions.map((pe) => ({ value: pe.id, label: pe.name }))
          ]}
          displayValue={matchedSubCategory?.name || '—'}
        />
      </td>
      <td>
        <EditableField
          type="select"
          value={editedTxn.accountId}
          setValue={(value) => setEditedTxn({ ...editedTxn, accountId: Number(value) })}
          editMode={isEditing}
          options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
          displayValue={matchedAccount?.name || 'N/A'}
        />
      </td>
      <td className="actions-cell">
        {isEditing ? (
          <>
            <button className="row-action-button save-button" onClick={handleSave}>
              <MdSave />
            </button>
            <button className="row-action-button cancel-button" onClick={handleCancel}>
              <MdClose />
            </button>
          </>
        ) : (
          <>
            <button className="row-action-button edit-button" onClick={() => setIsEditing(true)}>
              <MdEdit />
            </button>
            <button className="row-action-button delete-button" onClick={() => onDelete(txn.id)}>
              <MdDelete />
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

function CostsTable({ tableData, onUpdate, onDelete }) {
  const { categories, loading } = useCategories()

  const total = useMemo(() => {
    if (loading) return 0

    return tableData?.reduce((sum, txn) => {
      const category = categories.find(c => c.id === txn.categoryId);
      const isIncome = category?.isIncome || false;
      return sum + (isIncome ? txn.amount : -txn.amount);
    }, 0);
  }, [categories, loading, tableData])

  return loading ? null : (
    <div className="transactions-table-wrapper">
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Transaction</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Account</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((txn) => (
            <TransactionRow
              key={txn.id}
              txn={txn}
              onUpdate={onUpdate}
              onDelete={onDelete}
              categories={categories}
            />
          ))}
          <tr className="total-row">
            <td colSpan="2"><strong>Total</strong></td>
            <td className={`amount-cell ${total >= 0 ? 'positive-total' : 'negative-total'}`}>
              <strong>{total >= 0 ? '+' : '-'}${Math.abs(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </td>
            <td colSpan="3"></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function TrackedCosts() {
  const { categories, loading: categoriesLoading } = useCategories()
  const { accounts, loading: accountsLoading } = useAccounts()
  const {
    transactions,
    loading: transactionsLoading,
    addTransaction,
    addTransactionsBulk,
    deleteTransaction,
    updateTransaction
  } = useTransactions()

  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState([])
  const [selectedAccountFilters, setSelectedAccountFilters] = useState([])
  const [showNewTransactionMenu, setShowNewTransactionMenu] = useState(false)
  const [duplicateDialogData, setDuplicateDialogData] = useState(null)

  const loading = categoriesLoading || accountsLoading || transactionsLoading

  const now = new Date();
  const [newTransaction, setNewTransaction] = useState({
    title: '',
    amount: 0,
    categoryId: categories?.[0]?.id || null,
    projectedExpenseId: null,
    accountId: accounts?.[0]?.id || 1,
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear()
  })

  const newTransactionCategory = categories.find((c) => c.id === newTransaction.categoryId)

  const toggleCategoryFilter = (categoryId) => {
    setSelectedCategoryFilters(prev =>
      prev.includes(categoryId) ? prev.filter(name => name !== categoryId) : [...prev, categoryId]
    );
  };

  const toggleAccountFilter = (accountId) => {
    setSelectedAccountFilters(prev =>
      prev.includes(accountId) ? prev.filter(name => name !== accountId) : [...prev, accountId]
    );
  };

  const handleUpdateTransaction = async (updatedTxn) => {
    try {
      await updateTransaction(updatedTxn)
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert('Failed to update transaction. Please try again.')
    }
  };

  const handleDeleteTransaction = async (txnId) => {
    await deleteTransaction(txnId)
  }

  const resetNewTransaction = () => {
    const resetNow = new Date();
    setNewTransaction({
      title: '',
      amount: 0,
      categoryId: categories?.[0]?.id || null,
      projectedExpenseId: null,
      accountId: accounts?.[0]?.id || 1,
      day: resetNow.getDate(),
      month: resetNow.getMonth() + 1,
      year: resetNow.getFullYear()
    });
  };

  const handleCreateTransaction = async () => {
    if (newTransaction.title.trim() === '' || newTransaction.amount === 0) {
      alert('Please provide both a transaction title and amount.')
      return
    }

    const selectedAccount = accounts.find(acc => acc.id === newTransaction.accountId)
    if (!selectedAccount) {
      alert('Please select a valid account before creating a transaction.')
      return
    }

    try {
      const date = new Date(newTransaction.year, newTransaction.month - 1, newTransaction.day)
      await addTransaction({
        bankTransactionId: null,
        title: newTransaction.title,
        amount: Math.abs(newTransaction.amount),
        categoryId: newTransaction.categoryId,
        projectedExpenseId: newTransaction.projectedExpenseId,
        date: date.getTime(),
        accountId: selectedAccount.id
      })

      resetNewTransaction();
      setShowNewTransactionMenu(false);
    } catch (error) {
      console.error('Error creating transaction:', error)
      alert('Failed to create transaction. Please try again.')
    }
  };

  const handleCancelNewTransaction = () => {
    resetNewTransaction();
    setShowNewTransactionMenu(false);
  };

  const handleCsvImport = async (newTransactions) => {
    try {
      const transactionsToCreate = newTransactions.map((txn) => ({
        bankTransactionId: txn.bankTransactionId || null,
        title: txn.title,
        amount: txn.amount,
        categoryId: txn.categoryId,
        date: txn.date,
        accountId: txn.accountId
      }))

      const result = await addTransactionsBulk(transactionsToCreate)

      if (!result) {
        alert('Failed to import transactions. Please try again.')
        return
      }

      if (result.duplicateCount > 0) {
        setDuplicateDialogData({
          inDatabaseTransactions: result.databaseDuplicatedTransactions,
          newTransactions: result.duplicateTransactions
        })
      }
    } catch (error) {
      console.error('Error importing transactions:', error)
      alert('Failed to import transactions. Please try again.')
    }
  };

  const filteredData = useMemo(() => {
    let data = transactions
    if (selectedCategoryFilters.length > 0) data = data.filter(txn => selectedCategoryFilters.includes(txn.categoryId))
    if (selectedAccountFilters.length > 0) data = data.filter(txn => selectedAccountFilters.includes(txn.accountId))

    return data
  }, [selectedCategoryFilters, selectedAccountFilters, transactions])

  return loading ? (<div>
    <LoadingSpinner />
  </div>) : (
    <>
      {duplicateDialogData && (
        <DuplicatedTransactionsDialog
          inDatabaseTransactions={duplicateDialogData.inDatabaseTransactions}
          newTransactions={duplicateDialogData.newTransactions}
          onClose={() => setDuplicateDialogData(null)}
        />
      )}
      <div className="tracked-costs-container">
        <div id="tracked-table-options">
          <div className='filters-container'>
            <div className="filter-group">
              <label className="filter-label">Categories:</label>
              {categories?.map((category) => (
                <CategoryChip
                  key={category.id}
                  label={category.name}
                  color={category.color}
                  isSelected={selectedCategoryFilters.includes(category.id)}
                  onClick={() => toggleCategoryFilter(category.id)}
                />
              ))}
            </div>
            <div className="filter-group">
              <label className="filter-label">Accounts:</label>
              {accounts.map((account) => (
                <CategoryChip
                  key={account.id}
                  label={account.name}
                  color="gray"
                  isSelected={selectedAccountFilters.includes(account.id)}
                  onClick={() => toggleAccountFilter(account.id)}
                />
              ))}
            </div>
            {(selectedCategoryFilters.length > 0 || selectedAccountFilters.length > 0) && (
              <button id="clear-filters-button" onClick={() => {
                setSelectedCategoryFilters([]);
                setSelectedAccountFilters([]);
              }} >
                Clear Filters
              </button>
            )}
          </div>
          <div id="new-transactions-options" >
            <CsvUpload
              categories={categories}
              accounts={accounts}
              onImport={handleCsvImport}
            />
            <div className="new-transaction-wrapper">
              <button id="new-transaction-button" onClick={() => setShowNewTransactionMenu(!showNewTransactionMenu)}>Add Transaction</button>
              {showNewTransactionMenu && (
                <div className="new-transaction-menu">
                  <input
                    type="text"
                    placeholder="Transaction title"
                    value={newTransaction.title}
                    onChange={(e) => setNewTransaction({ ...newTransaction, title: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newTransaction.amount || ''}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })}
                  />
                  <select
                    value={newTransaction.categoryId || ''}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      categoryId: Number(e.target.value),
                      projectedExpenseId: null
                    })}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select
                    value={newTransaction.projectedExpenseId || ''}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      projectedExpenseId: Number(e.target.value) || null
                    })}
                  >
                    <option value="">No subcategory</option>
                    {(newTransactionCategory?.projectedExpenses || []).map(pe => (
                      <option key={pe.id} value={pe.id}>{pe.name}</option>
                    ))}
                  </select>
                  <select
                    value={newTransaction.accountId}
                    onChange={(e) => setNewTransaction({ ...newTransaction, accountId: Number(e.target.value) })}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                  <div className="date-inputs">
                    <input
                      type="number"
                      placeholder="Day"
                      min="1"
                      max="31"
                      value={newTransaction.day}
                      onChange={(e) => setNewTransaction({ ...newTransaction, day: Number(e.target.value) })}
                    />
                    <input
                      type="number"
                      placeholder="Month"
                      min="1"
                      max="12"
                      value={newTransaction.month}
                      onChange={(e) => setNewTransaction({ ...newTransaction, month: Number(e.target.value) })}
                    />
                    <input
                      type="number"
                      placeholder="Year"
                      value={newTransaction.year}
                      onChange={(e) => setNewTransaction({ ...newTransaction, year: Number(e.target.value) })}
                    />
                  </div>
                  <div className="new-transaction-buttons">
                    <button onClick={handleCreateTransaction}>Create</button>
                    <button onClick={handleCancelNewTransaction}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <CostsTable
          tableData={filteredData}
          onUpdate={handleUpdateTransaction}
          onDelete={handleDeleteTransaction}
        />
      </div>
    </>
  )
}
