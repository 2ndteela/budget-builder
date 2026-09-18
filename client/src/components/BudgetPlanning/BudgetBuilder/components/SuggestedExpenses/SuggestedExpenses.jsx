import './suggestedExpenses.css'
import { useState } from 'react'
import CompressedButton from '../../../../shared/CompressedButton/CompressedButton'
import { MdRemove, MdAdd, MdDelete, MdClose } from 'react-icons/md'
import formatCurrency from '../../../../../utilities/formateCurrency'
import useAppData from '../../../../../DataContext/useAppData'

export default function SuggestedExpenses({ suggestions = [], onAdd, onDismiss, onCombine }) {
  const [hideSuggestions, setHideSuggestions] = useState(false)
  const [checkedNames, setCheckedNames] = useState([])
  const [combined, setCombined] = useState({})

  const { categories: { categories } } = useAppData()

  // A suggestion has no id yet — the title it was derived from is what identifies it
  const handleCheck = (suggestion) => {
    const isFirstPick = checkedNames.length === 0
    const nextChecked = checkedNames.includes(suggestion.name)
      ? checkedNames.filter((name) => name !== suggestion.name)
      : [...checkedNames, suggestion.name]

    setCheckedNames(nextChecked)

    if (nextChecked.length === 0) {
      setCombined({})
      return
    }

    const total = nextChecked.reduce((sum, name) =>
      sum + (suggestions.find((item) => item.name === name)?.suggestedValue || 0), 0)

    // Unassigned is the select's own empty option rather than one of its entries, so seeding
    // it by id would leave the select showing nothing
    const suggested = suggestion.suggestedCategory
    const seededCategoryId = !suggested || suggested.isSystem ? 0 : suggested.id

    setCombined((prev) => ({
      ...prev,
      // The first pick seeds the category and the amount follows the running total, so
      // combining only ever asks the user for a name.
      categoryId: isFirstPick ? seededCategoryId : prev.categoryId,
      name: isFirstPick ? '' : prev.name,
      value: Math.round(total * 100) / 100
    }))
  }

  const clearSelection = () => {
    setCheckedNames([])
    setCombined({})
  }

  const combineSuggestions = async () => {
    if (!combined.name?.trim()) return

    try {
      await onCombine({
        name: combined.name.trim(),
        value: Number(combined.value) || 0,
        categoryId: Number(combined.categoryId) || 0,
        sources: checkedNames
      })
      clearSelection()
    } catch (err) {
      alert('Error combining suggestions')
      console.error(err)
    }
  }

  const isCombining = checkedNames.length > 1

  return (
    <div className='suggestions-container'>
      <div className='suggestions-header'>
        <h4>Suggested Expenses</h4>
        <div className='row-container'>
          {checkedNames.length > 0 && (
            <CompressedButton color='gray' Icon={MdClose} onClick={clearSelection}>
              Clear Selection
            </CompressedButton>
          )}
          <CompressedButton
            color='gray'
            Icon={hideSuggestions ? MdAdd : MdRemove}
            onClick={() => setHideSuggestions((hidden) => !hidden)}
          >
            {hideSuggestions ? 'Show Suggestions' : 'Hide Suggestions'}
          </CompressedButton>
        </div>
      </div>
      {!hideSuggestions && (
        <table className='suggestions-table'>
          <thead>
            <tr>
              <th className='select-cell'></th>
              <th>Name</th>
              <th>Amount</th>
              <th>Category</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {suggestions.length === 0 ? (
              <tr className='empty-suggestions-row'>
                <td colSpan='5'>No suggestions could be generated</td>
              </tr>
            ) : suggestions.map((e) => (
              <tr className={`suggested-expense-row color-${e.suggestedCategory?.color || 'gray'}`} key={e.name}>
                <td className='select-cell'>
                  <input
                    type='checkbox'
                    onChange={() => handleCheck(e)}
                    checked={checkedNames.includes(e.name)}
                    aria-label={`Select ${e.name} to combine`}
                  />
                </td>
                <td>{e.name}</td>
                <td>{formatCurrency(e.suggestedValue)}</td>
                <td>{e.suggestedCategory?.name || '—'}</td>
                <td className='actions-cell'>
                  <button className='row-action-button' onClick={() => onAdd(e)} aria-label='Add suggested expense'>
                    <MdAdd />
                  </button>
                  <button className='row-action-button delete-button' onClick={() => onDismiss(e)} aria-label='Dismiss suggestion'>
                    <MdDelete />
                  </button>
                </td>
              </tr>
            ))}
            {isCombining && (
              <tr className='combine-suggestions-row'>
                <td className='select-cell' />
                <td>
                  <input
                    type='text'
                    placeholder={`Combined name for ${checkedNames.length} suggestions`}
                    value={combined.name || ''}
                    onChange={({ target }) => setCombined((prev) => ({ ...prev, name: target.value }))}
                    onKeyDown={(event) => event.key === 'Enter' && combineSuggestions()}
                  />
                </td>
                <td>
                  <input
                    type='number'
                    placeholder='0'
                    value={combined.value ?? ''}
                    onChange={({ target }) => setCombined((prev) => ({ ...prev, value: target.value }))}
                    onKeyDown={(event) => event.key === 'Enter' && combineSuggestions()}
                  />
                </td>
                <td>
                  <select
                    value={combined.categoryId || 0}
                    onChange={({ target }) => setCombined((prev) => ({ ...prev, categoryId: target.value }))}
                  >
                    <option value={0}>Unassigned</option>
                    {categories.filter((category) => !category.isSystem).map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className='add-expense-button btn-green' onClick={combineSuggestions}>
                    Combine
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
