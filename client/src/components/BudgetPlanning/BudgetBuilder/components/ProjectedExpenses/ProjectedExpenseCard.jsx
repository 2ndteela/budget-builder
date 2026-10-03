import { useState } from 'react'
import { MdClose, MdSave, MdEdit, MdDelete } from 'react-icons/md'
import ExpansionPanel from '../../../../shared/ExpansionPanel/ExpansionPanel'
import EditableField from '../../../../shared/EditableField/EditableField'
import formatCurrency from '../../../../../utilities/formateCurrency'

const CURRENCY_FORMAT = { style: 'currency', currency: 'USD' }

// Planned vs. actual as a bar. Going over is only a problem for spending — income that
// comes in above plan stays in the normal color.
function ProgressBar({ spent, planned, isIncome, reserveSpace = false }) {
  // Nothing planned (e.g. the Unassigned bucket) has no meaningful percentage. reserveSpace
  // keeps an invisible track in its place so card headers all stay the same height.
  if (!planned) return reserveSpace ? <div className='expense-progress-track placeholder' aria-hidden /> : null

  const percent = Math.min((spent / planned) * 100, 100)
  const isOver = !isIncome && spent > planned

  return (
    <div className='expense-progress-track'>
      <div
        className={`expense-progress-fill${isOver ? ' over' : ''}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function SpentAmount({ spent, planned, isIncome }) {
  const isOver = !isIncome && planned > 0 && spent > planned

  return (
    <span className='expense-amounts'>
      <span className={isOver ? 'amount-negative' : undefined}>{formatCurrency(spent)}</span>
      {' / '}
      {formatCurrency(planned)}
    </span>
  )
}

function ProjectedExpenseRow({ expense, spent, isIncome, onUpdate, onRemove }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedExpense, setEditedExpense] = useState(expense)

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
    <div className={`projected-expense-card-row${isEditing ? ' editing' : ''}`}>
      <div className='projected-expense-card-row-main'>
        <div className='projected-expense-name'>
          <EditableField
            value={isEditing ? editedExpense.name : expense.name}
            setValue={(name) => setEditedExpense({ ...editedExpense, name })}
            editMode={isEditing}
          />
        </div>
        {isEditing ? (
          <div className='projected-expense-value-input'>
            <EditableField
              type='number'
              value={editedExpense.value}
              setValue={(value) => setEditedExpense({ ...editedExpense, value })}
              editMode
              formatOptions={CURRENCY_FORMAT}
            />
          </div>
        ) : (
          <SpentAmount spent={spent} planned={expense.value} isIncome={isIncome} />
        )}
        {/* The Unassigned bucket is maintained by the server — transactions land in it on
            their own, and the server rejects edits to it, so it gets no row actions. */}
        <div className='projected-expense-actions'>
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
        </div>
      </div>
      <ProgressBar spent={spent} planned={expense.value} isIncome={isIncome} />
    </div>
  )
}

/**
 * One category's projected expenses, each showing what was spent against what was planned.
 *
 * @param {category} object {name, color, isIncome}
 * @param {expenses} array of projected expenses in the category
 * @param {spentByExpense} object mapping a projected expense id to the amount booked against it
 */
export default function ProjectedExpenseCard({ category, expenses, spentByExpense, onUpdate, onRemove }) {
  const planned = expenses.reduce((sum, expense) => sum + expense.value, 0)
  const spent = expenses.reduce((sum, expense) => sum + (spentByExpense[expense.id] || 0), 0)
  const isIncome = category.isIncome

  const header = (
    <div className='projected-expense-card-header'>
      <div className='projected-expense-card-title'>
        <span>{category.name}</span>
        <SpentAmount spent={spent} planned={planned} isIncome={isIncome} />
      </div>
      <ProgressBar spent={spent} planned={planned} isIncome={isIncome} reserveSpace />
    </div>
  )

  return (
    <div className='projected-expense-card'>
      <ExpansionPanel title={header} color={category.color || 'gray'}>
        {expenses.map((expense) => (
          <ProjectedExpenseRow
            key={expense.id}
            expense={expense}
            spent={spentByExpense[expense.id] || 0}
            isIncome={isIncome}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </ExpansionPanel>
    </div>
  )
}
