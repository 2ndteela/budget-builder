import { useState } from 'react'
import './categoriesManager.css'
import supportedColors from '../../../../../utilities/supportedColors'
import { MdSave, MdClose, MdEdit, MdDelete } from 'react-icons/md'
import EditableField from '../../../../shared/EditableField/EditableField'
import useAppData from '../../../../../DataContext/useAppData'

export default function CategoriesManager() {
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editedCategory, setEditedCategory] = useState({})
  const [newCategory, setNewCategory] = useState({})

  const { categories: { categories, addNewCategory, updateCategory, deleteCategory } } = useAppData()

  const createCategory = async () => {
    try {
      await addNewCategory(newCategory)
    } catch (err) {
      alert('Error creating new category')
      console.error(err)
    }
  }
  const saveCategory = async (categoryId) => {
    try {
      await updateCategory({
        id: categoryId,
        ...editedCategory
      })
      setEditingCategoryId(null)
      setEditedCategory({})
    } catch (err) {
      alert('Error saving category')
      console.error(err)
    }
  }
  const removeCategory = async (id) => {
    try {

      await deleteCategory(id)
    } catch (err) {
      alert('Error deleting category')
      console.error(err)
    }
  }
  const editCategory = (c) => {
    setEditingCategoryId(c.id)
    setEditedCategory({ ...c })
  }
  const cancelEditCategory = () => {
    setEditingCategoryId(null)
    setEditedCategory({})
  }

  return (
    <div id="categories-container">
      <h3>Categories</h3>
      <div className='categories-list'>
        {categories?.map((c) => {
          const isEditing = editingCategoryId === c.id
          return (
            <div key={c.id} className={`category-item color-${c.color}`}>
              <>
                <span className="category-swatch" />
                {/* Unassigned is what every uncategorised expense falls back to, so its
                    name and income flag are fixed; only its colour can change. */}
                <EditableField
                  value={isEditing ? editedCategory.name : c.name}
                  setValue={(name) => setEditedCategory({ ...editedCategory, name })}
                  editMode={isEditing && !c.isSystem}
                />
                {isEditing && (
                  <select
                    value={editedCategory.color}
                    onChange={(e) => setEditedCategory({ ...editedCategory, color: e.target.value })}
                    className="category-color-select"
                  >
                    {supportedColors.map((color) => <option key={color.key} value={color.key}>{color.label}</option>)}
                  </select>
                )}
                {
                  isEditing && !c.isSystem && (
                    <label className="income-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editedCategory.isIncome}
                        onChange={(e) => setEditedCategory({ ...editedCategory, isIncome: e.target.checked })}
                      />
                      Income
                    </label>
                  )
                }
                {c.isIncome && <span className="income-tag">Income</span>}
                <div className="category-actions">
                  <button onClick={() => isEditing ? saveCategory(c.id) : editCategory(c)} className="category-action-btn">
                    {isEditing ? <MdSave /> : <MdEdit />}
                  </button>
                  {(isEditing || !c.isSystem) && (
                    <button onClick={() => isEditing ? cancelEditCategory() : removeCategory(c.id)} className={`category-action-btn ${isEditing ? '' : 'delete'}`}>
                      {isEditing ? <MdClose /> : <MdDelete />}
                    </button>
                  )}
                </div>
              </>
            </div>)
        })}
      </div>
      <div className="new-category-section">
        <input
          type="text"
          placeholder="New category name"
          value={newCategory.name}
          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
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
        <button onClick={createCategory} className="create-category-btn">
          Add Category
        </button>
      </div>
    </div>
  )
}
