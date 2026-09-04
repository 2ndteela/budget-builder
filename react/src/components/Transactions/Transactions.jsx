import { useMemo, useState } from 'react'
import './transactions.css'
import CategoryChip from '../shared/CategoryChip/CategoryChip'
import LoadingSpinner from '../shared/LoadingSpinner/LoadingSpinner'
import useAppData from '../../DataContext/useAppData'
import CsvUpload from './CsvImport/CsvUpload'
import DuplicatedTransactionsDialog from './CsvImport/DuplicatedTransactionsDialog'
import CreateNewTransaction from './CreateNewTransaction/CreateNewTransaction'
import TransactionTable from './TransactionTable/TransactionTable'

const toggleId = (id) => (selected) =>
  selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]

export default function Transactions() {
  const {
    accounts: { accounts, loading: accountsLoading },
    transactions: { transactions, loading: transactionsLoading, addTransactionsBulk },
    projectedExpenses: { projectedExpenses, loading: projectedExpensesLoading },
    monthlyBudgets: { loading: monthlyBudgetsLoading, monthlyBudgets }
  } = useAppData()

  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState([])
  const [selectedAccountFilters, setSelectedAccountFilters] = useState([])
  const [duplicateDialogData, setDuplicateDialogData] = useState(null)

  const loading = accountsLoading
    || transactionsLoading
    || projectedExpensesLoading
    || monthlyBudgetsLoading

  const hasFilters = selectedCategoryFilters.length > 0 || selectedAccountFilters.length > 0

  const filteredTransactions = useMemo(() => {
    // A transaction has no category of its own; it inherits one from the projected expense it is matched to.
    const categoryIdByExpenseId = new Map(projectedExpenses.map((expense) => [expense.id, expense.categoryId]))

    return transactions.filter((transaction) => {
      const categoryId = categoryIdByExpenseId.get(transaction.projectedExpenseId)
      const matchesCategory = selectedCategoryFilters.length === 0 || selectedCategoryFilters.includes(categoryId)
      const matchesAccount = selectedAccountFilters.length === 0 || selectedAccountFilters.includes(transaction.accountId)
      return matchesCategory && matchesAccount
    })
  }, [projectedExpenses, selectedAccountFilters, selectedCategoryFilters, transactions])

  const clearFilters = () => {
    setSelectedCategoryFilters([])
    setSelectedAccountFilters([])
  }

  const handleCsvImport = async (newTransactions) => {
    const result = await addTransactionsBulk(newTransactions)
    if (result?.duplicateCount > 0) {
      setDuplicateDialogData({
        inDatabaseTransactions: result.databaseDuplicatedTransactions,
        newTransactions: result.duplicateTransactions
      })
    }
  }

  if (loading) return <LoadingSpinner />

  const availableCategories = monthlyBudgets.reduce((acc, current) => {
    const categories = current.categories
    const uniqueCategories = categories.filter((c) => !acc.some((a) => a.id === c.id))
    return [...acc, ...uniqueCategories]
  }, [])

  return (
    <>
      {duplicateDialogData && (
        <DuplicatedTransactionsDialog
          inDatabaseTransactions={duplicateDialogData.inDatabaseTransactions}
          newTransactions={duplicateDialogData.newTransactions}
          onClose={() => setDuplicateDialogData(null)}
        />
      )}
      <div className='transactions-container'>
        <div id='transactions-table-options'>
          <div className='filters-container'>
            <div className='filter-group'>
              <label className='filter-label'>Categories:</label>
              {availableCategories.map((category) => (
                <CategoryChip
                  key={category.id}
                  label={category.name}
                  color={category.color}
                  isSelected={selectedCategoryFilters.includes(category.id)}
                  onClick={() => setSelectedCategoryFilters(toggleId(category.id))}
                />
              ))}
            </div>
            <div className='filter-group'>
              <label className='filter-label'>Accounts:</label>
              {accounts.map((account) => (
                <CategoryChip
                  key={account.id}
                  label={account.name}
                  color='gray'
                  isSelected={selectedAccountFilters.includes(account.id)}
                  onClick={() => setSelectedAccountFilters(toggleId(account.id))}
                />
              ))}
            </div>
            {hasFilters && (
              <button id='clear-filters-button' onClick={clearFilters}>Clear Filters</button>
            )}
          </div>
          <div id='new-transactions-options'>
            <CsvUpload onImport={handleCsvImport} />
            <CreateNewTransaction />
          </div>
        </div>
        <TransactionTable transactions={filteredTransactions} />
      </div>
    </>
  )
}
