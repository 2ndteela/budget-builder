/**
 * Transforms categories and projected expenses into WaterfallSelector menu options
 * @param {Array} categories - Array of category objects with id, name, color
 * @param {Array} projectedExpenses - Array of projected expense objects
 * @returns {Array} Menu options for WaterfallSelector
 */
export default function buildProjectedExpenseOptions(categories, projectedExpenses) {
  const options = [
    {
      label: 'Unassigned',
      value: null,
      optionColor: 'gray'
    }
  ]

  categories.forEach((category) => {
    const expenses = projectedExpenses.filter((expense) =>
      expense.categoryId === category.id && !expense.isCatchAll
    )

    if (expenses.length === 0) return

    options.push({
      label: category.name,
      value: `category-${category.id}`,
      optionColor: category.color,
      children: expenses.map((expense) => ({
        label: expense.name,
        value: expense.id,
        optionColor: category.color
      }))
    })
  })

  return options
}
