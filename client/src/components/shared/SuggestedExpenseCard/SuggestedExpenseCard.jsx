/**
 *
 * @param {title} string Title to display on card
 * @param {color} string that matches the colors in index.css
 * @param {expenses} array of objects that have {name: string, value: float}
 * @param {onAddExpense} async function called with the expense; resolves true once it was added
 * @param {onEmpty} function called once every expense on the card was added or dismissed
 * @returns
 */
import './suggestedExpenseCard.css'
import { MdAdd, MdClear } from "react-icons/md";
import ExpansionPanel from "../ExpansionPanel/ExpansionPanel";
import { useState, useMemo, useCallback, useEffect } from "react";
import formatCurrency from '../../../utilities/formateCurrency';

export default function SuggestedExpenseCard({ title, expenses = [], color = 'gray', onAddExpense, onEmpty = () => { } }) {

  // Names of the expenses already added or dismissed from this card
  const [filteredItems, setFilteredItems] = useState([])

  const filteredList = useMemo(() => {
    return expenses.filter((current) => !filteredItems.includes(current.name))
  }, [expenses, filteredItems])

  const removeExpense = useCallback((expense) => {
    setFilteredItems((v) => [...v, expense.name])
  }, [])

  // Only drops off the card once the add went through, so a failed add can be retried
  const addExpense = useCallback(async (expense) => {
    const added = await onAddExpense(expense)
    if (added) removeExpense(expense)
  }, [onAddExpense, removeExpense])

  const isEmpty = filteredList.length === 0

  // Lets the parent know this card is done, e.g. to bring back the button that created it
  useEffect(() => {
    if (isEmpty) onEmpty()
  }, [isEmpty, onEmpty])

  // Every suggestion in the category was added or dismissed, so the card has nothing left to show
  if (isEmpty) return null

  return (
    <div className="suggested-expense-card">
      <ExpansionPanel title={title} color={color} defaultExpanded>
        {filteredList.map((e) => (
          <div className="suggested-expense-card-row" key={e.name}>
            <div className="suggested-expense-card-name">{e.name}</div>
            <div className="suggested-expense-card-value">{formatCurrency(e.value)}</div>
            <button className="row-action-button" onClick={() => addExpense(e)} aria-label={`Add ${e.name}`}>
              <MdAdd />
            </button>
            <button className="row-action-button delete-button" onClick={() => removeExpense(e)} aria-label={`Dismiss ${e.name}`}>
              <MdClear />
            </button>
          </div>
        ))}
      </ExpansionPanel>
    </div>
  )
}
