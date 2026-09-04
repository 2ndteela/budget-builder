import { useState } from 'react'
import './projectedCosts.css'
import { MdEdit, MdSave, MdClose, MdDelete } from 'react-icons/md'
import AccountsManager from './AccountsManager'
import useAppData from '../../DataContext/useAppData'
import supportedColors from '../../utilities/supportedColors'
import BudgetBuilder from './BudgetBuilder'

export default function ProjectedCosts() {
  const { categories: categoryData, accounts: accountData } = useAppData()
  const { categories, loading: categoriesLoading, addNewCategory, updateCategory, deleteCategory } = categoryData
  const { accounts, loading: accountsLoading, addAccount, updateAccount, deleteAccount } = accountData

  const [newCategory, setNewCategory] = useState({ name: '', color: 'gray', isIncome: false })
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editedCategory, setEditedCategory] = useState({ name: '', color: 'gray', isIncome: false })

  const loading = categoriesLoading || accountsLoading

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setEditedCategory({ name: category.name, color: category.color, isIncome: category.isIncome });
  };

  const handleSaveCategory = async (categoryId) => {
    if (editedCategory.name.trim() === '') return;

    await updateCategory({
      id: categoryId,
      name: editedCategory.name.trim(),
      color: editedCategory.color,
      isIncome: editedCategory.isIncome
    });
    setEditingCategoryId(null);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
  };

  const handleDeleteCategory = async (categoryId) => {
    await deleteCategory(categoryId);
    if (editingCategoryId === categoryId) setEditingCategoryId(null);
  };

  const handleCreateCategory = async () => {
    if (newCategory.name.trim() !== '') {
      await addNewCategory({
        name: newCategory.name,
        color: newCategory.color,
        isIncome: newCategory.isIncome
      });
      setNewCategory({ name: '', color: 'gray', isIncome: false });
    }
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
      <div className='row-container'>
        <div id="categories-container">
          <h3>Categories</h3>
          <div className='categories-list'>
            {categories.map((c) => (
              <div key={c.id} className={`category-item color-${c.color}`}>
                {editingCategoryId === c.id ? (
                  <>
                    <span className="category-swatch" />
                    <input
                      type="text"
                      value={editedCategory.name}
                      onChange={(e) => setEditedCategory({ ...editedCategory, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory(c.id)}
                      className="category-name-input"
                    />
                    <select
                      value={editedCategory.color}
                      onChange={(e) => setEditedCategory({ ...editedCategory, color: e.target.value })}
                      className="category-color-select"
                    >
                      {supportedColors.map((color) => <option key={color.key} value={color.key}>{color.label}</option>)}
                    </select>
                    <label className="income-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editedCategory.isIncome}
                        onChange={(e) => setEditedCategory({ ...editedCategory, isIncome: e.target.checked })}
                      />
                      Income
                    </label>
                    <div className="category-actions">
                      <button onClick={() => handleSaveCategory(c.id)} className="category-action-btn">
                        <MdSave />
                      </button>
                      <button onClick={handleCancelEditCategory} className="category-action-btn">
                        <MdClose />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="category-swatch" />
                    <span className="category-name">{c.name}</span>
                    {c.isIncome && <span className="income-tag">Income</span>}
                    <div className="category-actions">
                      <button onClick={() => handleEditCategory(c)} className="category-action-btn">
                        <MdEdit />
                      </button>
                      <button onClick={() => handleDeleteCategory(c.id)} className="category-action-btn delete">
                        <MdDelete />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="new-category-section">
            <input
              type="text"
              placeholder="New category name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              className="category-name-input"
            />
            <select
              value={newCategory.color}
              onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
              className="category-color-select"
            >
              {supportedColors.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <label className="income-checkbox-label">
              <input
                type="checkbox"
                checked={newCategory.isIncome}
                onChange={(e) => setNewCategory({ ...newCategory, isIncome: e.target.checked })}
              />
              Income
            </label>
            <button onClick={handleCreateCategory} className="create-category-btn">
              Add Category
            </button>
          </div>
        </div>
        <AccountsManager
          accounts={accounts}
          onAdd={addAccount}
          onUpdate={updateAccount}
          onDelete={deleteAccount}
        />
      </div>
      <BudgetBuilder />
    </div>
  );
}
