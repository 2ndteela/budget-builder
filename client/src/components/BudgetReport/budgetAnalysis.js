const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// Mirrors the reserved category the server creates. Only used if the categories request
// has not landed yet, so an unplanned transaction still has somewhere to go.
const UNASSIGNED_NAME = 'Unassigned'
const UNASSIGNED_FALLBACK = {
  id: 'unassigned',
  name: UNASSIGNED_NAME,
  color: 'gray',
  isIncome: false,
  isSystem: true
}

const toCents = (amount) => Math.round((amount || 0) * 100) / 100
const sumAmounts = (transactions) => toCents(transactions.reduce((total, t) => total + (t.amount || 0), 0))
const daysInMonth = (year, month) => new Date(year, month, 0).getDate()

// Transaction.date is a day of the month; the budget supplies month and year
function toDate(year, month, day) {
  const lastDay = daysInMonth(year, month)
  return new Date(year, month - 1, Math.min(Math.max(day || 1, 1), lastDay))
}

// Walks the budgets once and pairs every transaction with the projected expense it was
// booked against. A transaction reaches its category through that expense, so one that
// arrives without a plan is booked to the month's Unassigned bucket instead of being set
// aside — every transaction ends up inside a category, and inside the analysis.
function joinBudgets(monthlyBudgets, unassignedCategory) {
  const expenseEntries = new Map()
  const catchAllIdByBudget = new Map()

  monthlyBudgets.forEach((budget) => {
    (budget.projectedExpenses || []).forEach((expense) => {
      expenseEntries.set(expense.id, { expense, budget, transactions: [] })
      if (expense.isCatchAll) catchAllIdByBudget.set(budget.id, expense.id)
    })
  })

  // The server gives every month its own Unassigned bucket on demand, so this only builds
  // one while an optimistic cache patch is still waiting on the refetch that returns it.
  const catchAllEntryFor = (budget) => {
    const existingId = catchAllIdByBudget.get(budget.id)
    if (existingId != null) return expenseEntries.get(existingId)

    const expense = {
      id: `unassigned-${budget.id}`,
      name: UNASSIGNED_NAME,
      value: 0,
      isCatchAll: true,
      category: unassignedCategory || UNASSIGNED_FALLBACK
    }

    const entry = { expense, budget, transactions: [] }
    expenseEntries.set(expense.id, entry)
    catchAllIdByBudget.set(budget.id, expense.id)

    return entry
  }

  monthlyBudgets.forEach((budget) => {
    (budget.transactions || []).forEach((transaction) => {
      const matched = transaction.projectedExpenseId == null
        ? null
        : expenseEntries.get(transaction.projectedExpenseId)

      const entry = matched || catchAllEntryFor(budget)
      entry.transactions.push(transaction)
    })
  })

  return expenseEntries
}

// The same merchant hits the same plan several times a month, so the raw list reads as
// noise. Collapse it to one row per title carrying the total, and keep the individual
// charges underneath with a real date so the breakdown is still there on demand.
function groupTransactions(transactions, budget) {
  const groups = new Map()

  transactions.forEach((transaction) => {
    const title = transaction.title || '—'

    if (!groups.has(title)) {
      groups.set(title, { key: title, title, total: 0, transactions: [] })
    }

    const group = groups.get(title)

    group.total = toCents(group.total + (transaction.amount || 0))
    group.transactions.push({
      ...transaction,
      // date is a day of the month; the budget supplies the rest
      occurredOn: toDate(budget.year, budget.month, transaction.date)
    })
  })

  return [...groups.values()]
    .map((group) => ({
      ...group,
      transactions: [...group.transactions].sort((left, right) => left.occurredOn - right.occurredOn)
    }))
    // Biggest spend first, so what moved the total is the first thing read
    .sort((left, right) => Math.abs(right.total) - Math.abs(left.total))
}

function buildCategories(expenseEntries, spansMultipleMonths, resolveCategory) {
  const categories = new Map()

  expenseEntries.forEach(({ expense, budget, transactions }) => {
    const category = resolveCategory(expense)

    if (!categories.has(category.id)) {
      categories.set(category.id, {
        ...category,
        projectedExpenses: [],
        projectedTotal: 0,
        transactionTotal: 0
      })
    }

    const entry = categories.get(category.id)
    const transactionTotal = sumAmounts(transactions)

    entry.projectedExpenses.push({
      id: expense.id,
      name: expense.name,
      value: toCents(expense.value),
      monthLabel: spansMultipleMonths ? `${MONTH_LABELS[budget.month - 1]} ${budget.year}` : null,
      transactionTotal,
      transactionGroups: groupTransactions(transactions, budget)
    })

    entry.projectedTotal = toCents(entry.projectedTotal + (expense.value || 0))
    entry.transactionTotal = toCents(entry.transactionTotal + transactionTotal)
  })

  return [...categories.values()]
}

// One point per day across the whole range, so a multi-month range reads as a single
// continuous burn rather than restarting each month.
function buildBurnUpPoints(monthlyBudgets, expenseEntries, resolveCategory) {
  const days = []

  monthlyBudgets.forEach((budget) => {
    const lastDay = daysInMonth(budget.year, budget.month)
    for (let day = 1; day <= lastDay; day++) {
      days.push(new Date(budget.year, budget.month - 1, day))
    }
  })

  if (days.length === 0) return []

  let projectedTotal = 0
  const dated = []

  expenseEntries.forEach(({ expense, budget, transactions }) => {
    const isIncome = resolveCategory(expense).isIncome
    if (!isIncome) projectedTotal += expense.value || 0

    transactions.forEach((transaction) => {
      dated.push({
        date: toDate(budget.year, budget.month, transaction.date),
        amount: transaction.amount || 0,
        isIncome
      })
    })
  })

  dated.sort((left, right) => left.date - right.date)

  const dailyProjectedRate = projectedTotal / days.length
  // Actuals stop at the last recorded transaction instead of flatlining to the end
  const lastTransactionDate = dated.length > 0 ? dated[dated.length - 1].date : days[0]

  let cursor = 0
  let actual = 0
  let income = 0

  return days.map((day, index) => {
    while (cursor < dated.length && dated[cursor].date <= day) {
      if (dated[cursor].isIncome) income += dated[cursor].amount
      else actual += dated[cursor].amount
      cursor++
    }

    const withinActuals = day <= lastTransactionDate

    return {
      date: `${String(day.getMonth() + 1).padStart(2, '0')}/${String(day.getDate()).padStart(2, '0')}`,
      timestamp: day.getTime(),
      cumulativeProjected: toCents(dailyProjectedRate * (index + 1)),
      cumulativeActual: withinActuals ? toCents(actual) : null,
      cumulativeIncome: withinActuals ? toCents(income) : null
    }
  })
}

// Derives the whole analysis tab — summary, category tree and chart points — from the
// monthly budgets in the selected range. Everything is one pass over the same join.
export default function buildBudgetAnalysis(monthlyBudgets = [], allCategories = []) {
  const budgets = [...monthlyBudgets].sort((left, right) =>
    left.year - right.year || left.month - right.month)

  // Optimistic cache patches carry the raw expense without its category embedded, so fall
  // back to looking the category up by id, and to Unassigned when even that comes up empty.
  // Resolution always yields a category, so no expense can drop out of the totals.
  const categoriesById = new Map(allCategories.map((category) => [category.id, category]))
  const unassignedCategory = allCategories.find((category) => category.isSystem)
  const resolveCategory = (expense) => expense.category
    || categoriesById.get(expense.categoryId)
    || unassignedCategory
    || UNASSIGNED_FALLBACK

  const expenseEntries = joinBudgets(budgets, unassignedCategory)
  const categories = buildCategories(expenseEntries, budgets.length > 1, resolveCategory)

  const totalIncome = toCents(categories
    .filter((category) => category.isIncome)
    .reduce((total, category) => total + category.transactionTotal, 0))

  const totalExpense = toCents(categories
    .filter((category) => !category.isIncome)
    .reduce((total, category) => total + category.transactionTotal, 0))

  const projectedExpense = toCents(categories
    .filter((category) => !category.isIncome)
    .reduce((total, category) => total + category.projectedTotal, 0))


  const projectedTotalIncome =
    monthlyBudgets.reduce((total, budget) => {
      const subTotal = budget.projectedExpenses.reduce((monthTotal, pe) => {
        return pe?.category.isIncome ? monthTotal + pe.value : monthTotal
      }, 0)
      console.log(subTotal)
      return subTotal + total
    }, 0)

  return {
    categories,
    totalIncome,
    totalExpense,
    projectedExpense,
    projectedTotalIncome,
    burnUpPoints: buildBurnUpPoints(budgets, expenseEntries, resolveCategory)
  }
}
