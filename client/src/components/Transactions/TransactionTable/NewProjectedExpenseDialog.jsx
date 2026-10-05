import { useMemo, useState } from 'react'
import WaterfallSelector from '../../shared/WaterfallSelector/WaterfallSelector'
import useAppData from '../../../DataContext/useAppData'
import { formatBudgetMonth } from '../../../utilities/dateFormatting'
import '../CsvImport/csvImport.css'

export default function NewProjectedExpenseDialog({ transactions, budget, onSaved, onClose }) {
  const {
    categories: { categories },
    monthlyBudgets: { addNewProjectedExpense },
    transactions: { assignTransactions }
  } = useAppData()

  const total = useMemo(
    () => transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    [transactions])

  const [name, setName] = useState(transactions[0]?.title || '')
  const [value, setValue] = useState(total.toFixed(2))
  const [categoryId, setCategoryId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const categoryOptions = useMemo(
    () => categories
      .filter((category) => !category.archived)
      .map((category) => ({ label: category.name, value: category.id, optionColor: category.color })),
    [categories])

  const categoryName = categories.find((category) => category.id === categoryId)?.name || 'Unassigned'

  const save = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      // No category lets the server file the expense under Unassigned
      const created = await addNewProjectedExpense({
        name: name.trim(),
        value: Math.abs(Number(value)) || 0,
        categoryId: categoryId || 0,
        monthlyBudgetId: budget.id
      })
      await assignTransactions({
        transactionIds: transactions.map((transaction) => transaction.id),
        projectedExpenseId: created.id
      })
      onSaved()
    } catch (err) {
      alert('Error creating projected expense')
      console.error(err)
      setIsSaving(false)
    }
  }

  return (
    <div className='csv-mapping-overlay'>
      <div className='csv-mapping-dialog new-expense-dialog'>
        <h2>New Projected Expense{budget ? ` — ${formatBudgetMonth(budget)}` : ''}</h2>

        <label className='new-expense-field'>
          <span>Name</span>
          <input type='text' value={name} onChange={({ target }) => setName(target.value)} />
        </label>

        <label className='new-expense-field'>
          <span>Amount ({transactions.length} selected)</span>
          <input
            type='number'
            min='0'
            step='0.01'
            value={value}
            onChange={({ target }) => setValue(target.value)}
          />
        </label>

        <WaterfallSelector
          label='Category'
          value={categoryName}
          onChange={(option) => setCategoryId(option.value)}
          menuOptions={categoryOptions}
        />

        <div className='csv-mapping-buttons'>
          <button className='btn-green' onClick={save} disabled={isSaving || !name.trim()}>Save</button>
          <button className='btn-gray' onClick={onClose} disabled={isSaving}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
