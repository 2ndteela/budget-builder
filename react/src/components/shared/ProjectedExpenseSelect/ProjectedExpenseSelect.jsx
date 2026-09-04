export default function ProjectedExpenseSelect({ categories, projectedExpenses, value, onChange }) {
  return (
    <select value={value || ''} onChange={({ target }) => onChange(Number(target.value) || null)}>
      <option value=''>No projected expense</option>
      {categories.map((category) => {
        const expenses = projectedExpenses.filter((expense) => expense.categoryId === category.id)
        if (expenses.length === 0) return null

        return (
          <optgroup key={category.id} label={category.name}>
            {expenses.map((expense) => (
              <option key={expense.id} value={expense.id}>{expense.name}</option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}
