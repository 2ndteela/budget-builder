import { useState, useEffect } from 'react'
import './projectedCosts.css'
import { MdEdit, MdSave, MdClose, MdDelete } from 'react-icons/md'
import CategoryChip from '../shared/CategoryChip/CategoryChip'
import AccountsManager from './AccountsManager'
import useCategories from '../../hooks/useCategories'
import useProjectedExpenses from '../../hooks/useProjectedExpenses'
import useAccounts from '../../hooks/useAccounts'
import supportedColors from '../../utilities/supportedColors'
import EditableField from '../shared/EditableField/EditableField'

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' }
]

function MonthFrequencyPicker({ value, onChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState(() => {
    if (!value || value === '') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    return value.split(',').map(Number)
  })

  const toggleMonth = (monthValue) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthValue)) {
        return prev.filter(m => m !== monthValue)
      } else {
        return [...prev, monthValue].sort((a, b) => a - b)
      }
    })
  }

  const handleApply = () => {
    const freq = selectedMonths.length === 12 ? '' : selectedMonths.join(',')
    onChange(freq)
    setMenuOpen(false)
  }

  const handleCancel = () => {
    if (!value || value === '') {
      setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    } else {
      setSelectedMonths(value.split(',').map(Number))
    }
    setMenuOpen(false)
  }

  const formatDisplay = () => {
    if (selectedMonths.length === 12) return 'Monthly'
    if (selectedMonths.length === 0) return 'Never'
    return selectedMonths.map(m => MONTHS.find(mo => mo.value === m)?.label).join(', ')
  }

  return (
    <div className="month-frequency-picker">
      <button type="button" className="frequency-trigger-button" onClick={() => setMenuOpen(!menuOpen)}>
        {formatDisplay()}
      </button>
      {menuOpen && (
        <div className="frequency-menu">
          <div className="frequency-month-grid">
            {MONTHS.map((month) => (
              <button
                key={month.value}
                type="button"
                className={`frequency-month-button ${selectedMonths.includes(month.value) ? 'selected' : ''}`}
                onClick={() => toggleMonth(month.value)}
              >
                {month.label}
              </button>
            ))}
          </div>
          <div className="frequency-menu-actions">
            <button type="button" className="frequency-cancel-button" onClick={handleCancel}>Cancel</button>
            <button type="button" className="frequency-apply-button" onClick={handleApply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  )
}

// this is where the table will be built
function CostTable({ projectedCost, onUpdate, onDelete, onExpenseUpdate, onExpenseDelete, onExpenseAdd }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedExpenses, setEditedExpenses] = useState(projectedCost.projectedExpenses);
  const [editedColor, setEditedColor] = useState(projectedCost.color);
  const [newExpense, setNewExpense] = useState({ name: '', value: 0, frequency: '', expiration: -1 });

  const total = editedExpenses.reduce((sum, expense) => sum + expense.value, 0);

  const handleSave = async () => {
    const filtered = editedExpenses.filter(e => e.name.trim() !== '');

    // Handle individual expense updates/deletes/adds
    const originalExpenses = projectedCost.projectedExpenses || [];

    // Find deleted expenses
    for (const originalExp of originalExpenses) {
      if (!filtered.find(e => e.id === originalExp.id)) {
        await onExpenseDelete(originalExp.id);
      }
    }

    // Update existing or add new expenses
    for (const exp of filtered) {
      if (exp.id) {
        // Existing expense - update if changed
        const original = originalExpenses.find(e => e.id === exp.id);
        if (original && (original.name !== exp.name || original.value !== exp.value || original.frequency !== exp.frequency || original.expiration !== exp.expiration)) {
          await onExpenseUpdate({
            id: exp.id,
            name: exp.name,
            value: exp.value,
            frequency: exp.frequency,
            expiration: exp.expiration,
            categoryId: projectedCost.id
          });
        }
      } else {
        // New expense
        const created = await onExpenseAdd({
          name: exp.name,
          value: exp.value,
          frequency: exp.frequency,
          expiration: exp.expiration,
          categoryId: projectedCost.id
        });
        if (created) {
          exp.id = created.id;
        }
      }
    }

    // Update category color if changed
    if (editedColor !== projectedCost.color) {
      await onUpdate({
        id: projectedCost.id,
        name: projectedCost.name,
        isIncome: projectedCost.isIncome,
        color: editedColor
      });
    }

    setIsEditing(false);
    setNewExpense({ name: '', value: 0 });
  };

  const handleCancel = () => {
    setEditedExpenses(projectedCost.projectedExpenses);
    setEditedColor(projectedCost.color);
    setIsEditing(false);
    setNewExpense({ name: '', value: 0, frequency: '', expiration: 0 });
  };

  const updateExpense = (idx, field, value) => {
    const updated = [...editedExpenses];
    updated[idx] = { ...updated[idx], [field]: field === 'value' ? Number(value) || 0 : value };
    setEditedExpenses(updated);
  };

  const deleteExpense = (idx) => {
    setEditedExpenses(editedExpenses.filter((_, i) => i !== idx));
  };

  const handleNewExpenseChange = (field, value) => {
    const updated = { ...newExpense, [field]: field === 'value' ? Number(value) || 0 : value };
    setNewExpense(updated);
  };

  const handleNewExpenseComplete = () => {
    if (newExpense.name.trim() !== '') {
      setEditedExpenses([...editedExpenses, newExpense]);
      setNewExpense({ name: '', value: 0, frequency: '', expiration: 0 });
    }
  };

  const parseFrequency = (freq) => {
    if (!freq || freq === '') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    return freq.split(',').map(Number)
  }

  const formatFrequencyDisplay = (freq) => {
    if (!freq || freq === '') return 'Monthly'
    const months = parseFrequency(freq)
    if (months.length === 0) return 'Never'
    return months.map(m => MONTHS.find(mo => mo.value === m)?.label).join(', ')
  }

  const handleAmountKeyDown = (e) => {
    if (e.key === 'Tab') {
      handleNewExpenseComplete();
    }
  };

  return (
    <div className={`cost-table color-${editedColor} ${isEditing ? 'editing' : ''}`}>
      <div className="cost-table-header">
        <div className="header-title-section">
          <h3>{projectedCost.name}</h3>
          {isEditing && (
            <select
              value={editedColor}
              onChange={(e) => setEditedColor(e.target.value)}
              className="color-select"
            >
              {supportedColors.map((c) => <option value={c.key}>{c.label}</option>)}
            </select>
          )}
        </div>
        <div className="header-buttons">
          <button className="edit-button" onClick={isEditing ? handleSave : () => setIsEditing(true)}>
            {isEditing ? <MdSave /> : <MdEdit />}
          </button>
          {isEditing && (
            <button className="cancel-button" onClick={handleCancel}>
              <MdClose />
            </button>
          )}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Expense</th>
            <th>Amount</th>
            <th>Frequency</th>
            <th>Expires</th>
            {isEditing && <th></th>}
          </tr>
        </thead>
        <tbody>
          {editedExpenses.map((expense, idx) => (
            <tr key={idx}>
              <td>
                <EditableField
                  type="text"
                  value={expense.name}
                  setValue={(value) => updateExpense(idx, 'name', value)}
                  editMode={isEditing}
                />
              </td>
              <td>
                <EditableField
                  type="number"
                  value={expense.value}
                  setValue={(value) => updateExpense(idx, 'value', value)}
                  editMode={isEditing}
                  prefix="$"
                />
              </td>
              <td>
                {isEditing ? (
                  <MonthFrequencyPicker
                    value={expense.frequency || ''}
                    onChange={(value) => updateExpense(idx, 'frequency', value)}
                  />
                ) : (
                  formatFrequencyDisplay(expense.frequency)
                )}
              </td>
              <td>
                <EditableField
                  type="number"
                  value={expense.expiration === 0 ? '' : expense.expiration}
                  setValue={(value) => updateExpense(idx, 'expiration', value === '' ? 0 : value)}
                  editMode={isEditing}
                  placeholder="Never"
                  emptyDisplayValue="Never"
                  formatOptions={{ useGrouping: false }}
                />
              </td>
              {isEditing && (
                <td>
                  <button className="delete-row-button" onClick={() => deleteExpense(idx)}>
                    <MdDelete />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {isEditing && (
            <tr className="new-expense-row">
              <td>
                <input
                  type="text"
                  placeholder="New expense"
                  value={newExpense.name}
                  onChange={(e) => handleNewExpenseChange('name', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  placeholder="0"
                  value={newExpense.value || ''}
                  onChange={(e) => handleNewExpenseChange('value', e.target.value)}
                  onBlur={handleNewExpenseComplete}
                  onKeyDown={handleAmountKeyDown}
                />
              </td>
              <td>
                <MonthFrequencyPicker
                  value={newExpense.frequency}
                  onChange={(value) => handleNewExpenseChange('frequency', value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  placeholder="Never"
                  value={newExpense.expiration === -1 ? '' : newExpense.expiration}
                  onChange={(e) => handleNewExpenseChange('expiration', e.target.value === '' ? 0 : parseInt(e.target.value))}
                />
              </td>
              <td></td>
            </tr>
          )}
          <tr className="total-row">
            <td><strong>Total</strong></td>
            <td><strong>${total.toLocaleString()}</strong></td>
            <td></td>
            <td></td>
            {isEditing && <td></td>}
          </tr>
        </tbody>
      </table>
      {isEditing && (
        <button className="delete-category-button" onClick={() => onDelete(projectedCost.id)}>
          Delete Category
        </button>
      )}
    </div>
  );
}

export default function ProjectedCosts() {
  const [startDate, setStartDate] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('startDate')
  })
  const [endDate, setEndDate] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('endDate')
  })

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search)
      setStartDate(params.get('startDate'))
      setEndDate(params.get('endDate'))
    }

    window.addEventListener('popstate', handleUrlChange)

    const originalReplaceState = window.history.replaceState
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(window.history, args)
      handleUrlChange()
    }

    return () => {
      window.removeEventListener('popstate', handleUrlChange)
      window.history.replaceState = originalReplaceState
    }
  }, [])

  const { categories, loading: categoriesLoading, addNewCategory, updateCategory, deleteCategory } = useCategories(startDate, endDate)
  const { addNewProjectedExpense, updateProjectedExpense, deleteProjectExpense } = useProjectedExpenses(categories)
  const { accounts, loading: accountsLoading, addAccount, updateAccount, deleteAccount } = useAccounts()

  const [selectedChips, setSelectedChips] = useState([])
  const [showNewCategoryMenu, setShowNewCategoryMenu] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', color: 'gray', isIncome: false })

  const loading = categoriesLoading || accountsLoading

  const toggleChip = (id) => {
    setSelectedChips(prev =>
      prev.includes(id) ? prev.filter(chipId => chipId !== id) : [...prev, id]
    );
  };

  const updateProjectedCost = async (updated) => {
    await updateCategory({
      id: updated.id,
      name: updated.name,
      color: updated.color,
      isIncome: updated.isIncome
    });
  };

  const deleteProjectedCost = async (id) => {
    await deleteCategory(id);
    setSelectedChips(selectedChips.filter(chipId => chipId !== id));
  };

  const handleCreateCategory = async () => {
    if (newCategory.name.trim() !== '') {
      await addNewCategory({
        name: newCategory.name,
        color: newCategory.color,
        isIncome: newCategory.isIncome
      });
      setNewCategory({ name: '', color: 'gray', isIncome: false });
      setShowNewCategoryMenu(false);
    }
  };

  const handleCancelNewCategory = () => {
    setNewCategory({ name: '', color: 'gray', isIncome: false });
    setShowNewCategoryMenu(false);
  };

  if (loading) {
    return (
      <div className="projected-costs-container">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="projected-costs-container">
      <h3>Categories</h3>
      <div className='chips-container'>
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.name}
            color={c.color}
            isSelected={selectedChips.includes(c.id)}
            onClick={() => toggleChip(c.id)}
          />
        ))}
        <div className="new-category-wrapper">
          <button id="new-category-button" onClick={() => setShowNewCategoryMenu(!showNewCategoryMenu)}>+</button>
          {showNewCategoryMenu && (
            <div className="new-category-menu">
              <input
                type="text"
                placeholder="Category name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
              <select
                value={newCategory.color}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
              >
                {supportedColors.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <label className="income-checkbox-label">
                <input
                  type="checkbox"
                  checked={newCategory.isIncome}
                  onChange={(e) => setNewCategory({ ...newCategory, isIncome: e.target.checked })}
                />
                Income Category
              </label>
              <div className="new-category-buttons">
                <button onClick={handleCreateCategory}>Create</button>
                <button onClick={handleCancelNewCategory}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className='data-container'>
        {categories.map((c) => selectedChips.includes(c.id) && (
          <CostTable
            key={c.id}
            projectedCost={{
              ...c,
              projectedExpenses: c.projectedExpenses || []
            }}
            onUpdate={updateProjectedCost}
            onDelete={deleteProjectedCost}
            onExpenseAdd={addNewProjectedExpense}
            onExpenseUpdate={updateProjectedExpense}
            onExpenseDelete={deleteProjectExpense}
          />
        ))}
      </div>
      <AccountsManager
        accounts={accounts}
        onAdd={addAccount}
        onUpdate={updateAccount}
        onDelete={deleteAccount}
      />
    </div>
  );
}
