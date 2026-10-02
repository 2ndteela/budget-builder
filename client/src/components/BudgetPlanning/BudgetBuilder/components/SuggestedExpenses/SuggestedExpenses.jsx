import './suggestedExpenses.css'
import { useState, useEffect, useCallback } from 'react'
import CompressedButton from '../../../../shared/CompressedButton/CompressedButton'
import { MdRemove, MdAdd } from 'react-icons/md'
import SuggestedExpenseCard from '../../../../shared/SuggestedExpenseCard/SuggestedExpenseCard'

// suggestions is the server's list of categories, each carrying its suggested expenses
export default function SuggestedExpenses({ suggestions = [], onAdd, onCleared }) {
  const [hideSuggestions, setHideSuggestions] = useState(false)
  const [emptiedCategoryIds, setEmptiedCategoryIds] = useState([])

  const markEmptied = useCallback((categoryId) => {
    setEmptiedCategoryIds((ids) => ids.includes(categoryId) ? ids : [...ids, categoryId])
  }, [])

  // Every card has been worked through, so there is nothing left to suggest
  const allCleared = suggestions.length > 0 &&
    suggestions.every((category) => emptiedCategoryIds.includes(category.id))

  useEffect(() => {
    if (allCleared) onCleared()
  }, [allCleared, onCleared])

  return (
    <div className='suggestions-container'>
      <div className='suggestions-header'>
        <h4>Suggested Expenses</h4>
        <CompressedButton
          color='gray'
          Icon={hideSuggestions ? MdAdd : MdRemove}
          onClick={() => setHideSuggestions((hidden) => !hidden)}
        >
          {hideSuggestions ? 'Show Suggestions' : 'Hide Suggestions'}
        </CompressedButton>
      </div>
      {/* Hidden rather than unmounted so each card keeps track of what was added or dismissed */}
      <div className='suggestion-cards' hidden={hideSuggestions}>
        {suggestions.map((category) => (
          <SuggestedExpenseCard
            key={category.id}
            title={category.name}
            color={category.color}
            expenses={category.projectedExpenses}
            onAddExpense={onAdd}
            onEmpty={() => markEmptied(category.id)}
          />
        ))}
      </div>
    </div>
  )
}
