const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// A monthly budget places its transactions and projected expenses in time.
export function formatBudgetMonth(monthlyBudget) {
  if (!monthlyBudget) return 'Unscheduled'
  return monthFormatter.format(new Date(monthlyBudget.year, monthlyBudget.month - 1, 1))
}

// A transaction only stores the day of the month; its budget carries month and year.
export function formatTransactionDate(day, monthlyBudget) {
  if (!monthlyBudget) return `Day ${day}`
  return dateFormatter.format(new Date(monthlyBudget.year, monthlyBudget.month - 1, day))
}
