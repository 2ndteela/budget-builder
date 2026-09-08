export default function ProjectedExpenseSelect({ categories, projectedExpenses, value, onChange }) {
  // A transaction with no plan is booked to the month's Unassigned bucket, so that bucket
  // and the empty option are the same choice: it is offered once, and a transaction already
  // sitting in it reads back as Unassigned rather than as a blank select.
  const catchAllIds = new Set(projectedExpenses.filter((expense) => expense.isCatchAll).map((expense) => expense.id))
  const selected = value && !catchAllIds.has(value) ? value : ''

  return (
    <select value={selected} onChange={({ target }) => onChange(Number(target.value) || null)}>
      <option value=''>Unassigned</option>
      {categories.map((category) => {
        const expenses = projectedExpenses.filter((expense) =>
          expense.categoryId === category.id && !expense.isCatchAll)
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
