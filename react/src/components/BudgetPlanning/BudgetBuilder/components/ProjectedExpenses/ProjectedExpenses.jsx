import { useState, useCallback, useMemo } from 'react'
import CompressedButton from '../../../../shared/CompressedButton/CompressedButton'
import { MdAutoAwesome, MdClose, MdAdd, MdSave, MdEdit, MdDelete } from 'react-icons/md'
import SuggestedExpenses from '../SuggestedExpenses/SuggestedExpenses'
import './projectedExpenses.css'
import useAppData from '../../../../../DataContext/useAppData'
import EditableField from '../../../../shared/EditableField/EditableField'

const CURRENCY_FORMAT = { style: 'currency', currency: 'USD' }

function ProjectedExpenseRow({ expense, categories, onUpdate, onRemove, handleChecked, isChecked, disabled }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedExpense, setEditedExpense] = useState(expense)
  const category = categories.find((item) => item.id === expense.categoryId)

  const startEditing = () => {
    setEditedExpense(expense)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (editedExpense.name.trim() === '') return

    try {
      await onUpdate({ ...editedExpense, name: editedExpense.name.trim() })
      setIsEditing(false)
    } catch (err) {
      alert('Error updating expense')
      console.error(err)
    }
  }

  const handleCancel = () => {
    setEditedExpense(expense)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    try {
      await onRemove(expense.id)
    } catch (err) {
      alert('Error deleting expense')
      console.error(err)
    }
  }

  return (
    <tr className={`projected-expense-table-row color-${category?.color || 'gray'}`}>
      {/* The Unassigned bucket is server-owned, so it cannot be folded into anything */}
      <td className='select-cell'>
        <input
          type='checkbox'
          onChange={() => handleChecked(expense.id)}
          checked={isChecked}
          disabled={disabled || expense.isCatchAll}
          aria-label={`Select ${expense.name} to combine`}
        />
      </td>
      <td style={{ textAlign: 'left' }} >
        <EditableField
          value={isEditing ? editedExpense.name : expense.name}
          setValue={(name) => setEditedExpense({ ...editedExpense, name })}
          editMode={isEditing}
        />
      </td>
      <td>
        <EditableField
          type='number'
          value={isEditing ? editedExpense.value : expense.value}
          setValue={(value) => setEditedExpense({ ...editedExpense, value })}
          editMode={isEditing}
          formatOptions={CURRENCY_FORMAT}
        />
      </td>
      <td>
        <EditableField
          type='select'
          value={isEditing ? editedExpense.categoryId : expense.categoryId}
          setValue={(categoryId) => setEditedExpense({ ...editedExpense, categoryId: Number(categoryId) })}
          editMode={isEditing}
          options={categories.map((item) => ({ value: item.id, label: item.name }))}
          displayValue={category?.name || '—'}
        />
      </td>
      {/* The Unassigned bucket is maintained by the server — transactions land in it on
          their own, and the server rejects edits to it, so it gets no row actions. */}
      <td className='actions-cell'>
        {expense.isCatchAll ? null : isEditing ? (
          <>
            <button className='row-action-button save-button' onClick={handleSave} aria-label='Save expense'>
              <MdSave />
            </button>
            <button className='row-action-button cancel-button' onClick={handleCancel} aria-label='Cancel expense edit'>
              <MdClose />
            </button>
          </>
        ) : (
          <>
            <button className='row-action-button edit-button' onClick={startEditing} aria-label='Edit expense'>
              <MdEdit />
            </button>
            <button className='row-action-button delete-button' onClick={handleDelete} aria-label='Delete expense'>
              <MdDelete />
            </button>
          </>
        )}
      </td>
    </tr>
  )
}

export default function ProjectedExpenses({ monthlyBudgetId }) {
  const [newExpense, setNewExpense] = useState({})
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [suggestedExpenses, setSuggestedExpenses] = useState([])
  const [checkedFields, setCheckedFields] = useState([])

  const {
    categories: { categories },
    monthlyBudgets: {
      monthlyBudgets,
      addNewProjectedExpense,
      updateProjectedExpense,
      deleteProjectedExpense,
      combineProjectedExpenses
    }
  } = useAppData()

  const budget = monthlyBudgets.find((item) => item.id === monthlyBudgetId)
  const expenses = useMemo(() => {
    return budget?.projectedExpenses || []
  }, [budget?.projectedExpenses])

  const handleNewExpenseChange = (field, value) => setNewExpense((v) => ({ ...v, [field]: value }))

  const handleCheck = useCallback((id) => {
    const storedExpense = expenses.find((item) => item.id === id)
    if (!storedExpense) return

    const isFirstPick = checkedFields.length === 0
    const nextChecked = checkedFields.includes(id)
      ? checkedFields.filter((item) => item !== id)
      : [...checkedFields, id]

    setCheckedFields(nextChecked)

    // Nothing selected means nothing to combine, so the row goes back to empty
    if (nextChecked.length === 0) {
      setNewExpense({})
      return
    }

    const total = nextChecked.reduce((sum, checkedId) =>
      sum + (expenses.find((item) => item.id === checkedId)?.value || 0), 0)

    // Unassigned is the select's own empty option rather than one of its entries, so seeding
    // it by id would leave the select showing nothing
    const seededCategoryId = categories.find((item) => item.id === storedExpense.categoryId)?.isSystem
      ? 0
      : storedExpense.categoryId

    setNewExpense((prev) => ({
      ...prev,
      // The first pick seeds the category, so the usual case needs no extra input, and the
      // amount tracks the running total so combining leaves the month's plan where it was.
      categoryId: isFirstPick ? seededCategoryId : prev.categoryId,
      name: isFirstPick ? '' : prev.name,
      value: Math.round(total * 100) / 100
    }))
  }, [categories, checkedFields, expenses])

  const clearSelection = () => {
    setCheckedFields([])
    setNewExpense({})
  }

  const combineExpenses = async () => {
    if (!newExpense.name?.trim()) return

    try {
      // The server does the whole swap in one transaction: the combined expense inherits
      // every transaction the originals held, then the originals go away.
      await combineProjectedExpenses({
        name: newExpense.name.trim(),
        value: Number(newExpense.value) || 0,
        categoryId: Number(newExpense.categoryId) || 0,
        monthlyBudgetId,
        sourceExpenseIds: checkedFields
      })
      clearSelection()
    } catch (err) {
      alert('Error combining expenses')
      console.error(err)
    }
  }

  const handleCancelNewExpense = () => {
    setNewExpense({})
    setShowNewExpense(false)
  }

  const handleCreateExpense = async () => {
    // A name is all that is required. Sending no category lets the server file the
    // expense under Unassigned rather than blocking the user on a decision.
    if (!newExpense.name?.trim()) return

    try {
      await addNewProjectedExpense({
        ...newExpense,
        name: newExpense.name.trim(),
        value: Number(newExpense.value) || 0,
        categoryId: Number(newExpense.categoryId) || 0,
        monthlyBudgetId
      })
      handleCancelNewExpense()
    } catch (err) {
      alert('Error creating expense')
      console.error(err)
    }
  }

  const createSuggestions = async () => {
    try {
      const resp = await fetch('http://localhost:5102/projected-expenses/suggestions')
      if (!resp.ok) throw new Error('Failed to fetch suggestions')

      const data = await resp.json()
      setSuggestedExpenses(data.filter((suggestion) =>
        !expenses.some((expense) => expense.name === suggestion.name)))
    } catch (err) {
      alert('Error creating suggestions')
      console.error(err)
    }
  }

  const addSuggestion = async (suggestion) => {
    try {
      await addNewProjectedExpense({
        name: suggestion.name,
        value: suggestion.suggestedValue,
        // Suggestions come back with a category the server inferred, or Unassigned when
        // it could not infer one, so a suggestion is always acceptable as-is.
        categoryId: suggestion.suggestedCategory?.id || 0,
        monthlyBudgetId
      })
      dismissSuggestion(suggestion)
    } catch (err) {
      alert('Error adding suggested expense')
      console.error(err)
    }
  }

  const dismissSuggestion = (suggestion) =>
    setSuggestedExpenses((prev) => prev.filter((item) => item.name !== suggestion.name))

  // Suggestions are client-side only, so folding them together is one new expense carrying
  // the summed amount; the suggestions it replaces come off the list.
  const combineSuggestions = async ({ name, value, categoryId, sources }) => {
    await addNewProjectedExpense({ name, value, categoryId, monthlyBudgetId })
    setSuggestedExpenses((prev) => prev.filter((item) => !sources.includes(item.name)))
  }

  // The same row does double duty: a brand new expense, or the merge of the checked ones
  const isCombining = !showNewExpense && checkedFields.length > 1
  const submitRow = () => (isCombining ? combineExpenses() : handleCreateExpense())

  return (
    <div className='budget-expenses-panel'>
      {suggestedExpenses.length > 0 && (
        <SuggestedExpenses
          suggestions={suggestedExpenses}
          onAdd={addSuggestion}
          onDismiss={dismissSuggestion}
          onCombine={combineSuggestions}
        />
      )}
      <div className='row-container budget-expenses-header'>
        <h4>Projected Expenses</h4>
        <div className='row-container'>
          {suggestedExpenses.length === 0 && (
            <CompressedButton color='teal' Icon={MdAutoAwesome} onClick={createSuggestions}>
              Create Suggestions
            </CompressedButton>
          )}
          {checkedFields.length > 0 && !showNewExpense && (
            <CompressedButton color='gray' Icon={MdClose} onClick={clearSelection}>
              Clear Selection
            </CompressedButton>
          )}
          {/* One row serves both jobs, so starting a new expense drops any selection */}
          <CompressedButton
            onClick={() => {
              if (showNewExpense) return handleCancelNewExpense()
              clearSelection()
              setShowNewExpense(true)
            }}
            Icon={showNewExpense ? MdClose : MdAdd}
          >
            {showNewExpense ? 'Cancel' : 'New Expense'}
          </CompressedButton>
        </div>
      </div>
      <div className='projected-expenses'>
        <table>
          <thead>
            <tr>
              <th className='select-cell'></th>
              <th style={{ textAlign: 'left' }} >Name</th>
              <th>Amount</th>
              <th>Category</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && !showNewExpense && (
              <tr className='empty-budget-row'>
                <td colSpan='5'>No projected expenses yet</td>
              </tr>
            )}
            {expenses.map((pe) => (
              <ProjectedExpenseRow
                key={pe.id}
                expense={pe}
                categories={categories}
                onUpdate={updateProjectedExpense}
                onRemove={deleteProjectedExpense}
                handleChecked={handleCheck}
                isChecked={checkedFields.includes(pe.id)}
                disabled={showNewExpense}
              />
            ))}
            {(showNewExpense || isCombining) && (
              <tr className='new-expense-row'>
                <td className='select-cell' />
                <td>
                  <input
                    type='text'
                    placeholder={isCombining ? `Combined name for ${checkedFields.length} expenses` : 'New expense'}
                    value={newExpense.name || ''}
                    onChange={({ target }) => handleNewExpenseChange('name', target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitRow()}
                  />
                </td>
                <td>
                  <input
                    type='number'
                    placeholder='0'
                    value={newExpense.value ?? ''}
                    onChange={({ target }) => handleNewExpenseChange('value', target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitRow()}
                  />
                </td>
                <td>
                  <select
                    value={newExpense.categoryId || 0}
                    onChange={({ target }) => handleNewExpenseChange('categoryId', target.value)}
                  >
                    <option value={0}>Unassigned</option>
                    {categories.filter((c) => !c.isSystem).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className='add-expense-button btn-green' onClick={submitRow}>
                    {isCombining ? 'Combine' : 'Add'}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
