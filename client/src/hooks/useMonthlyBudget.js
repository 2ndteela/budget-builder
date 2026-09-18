import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

export default function useMonthlyBudget(startDate, endDate) {
  const baseURL = 'http://localhost:5102/monthly-budget'
  const expensesURL = 'http://localhost:5102/projected-expenses'
  const queryClient = useQueryClient()
  const queryKey = ['monthly-budget', startDate, endDate]

  const { data: monthlyBudgets = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const response = await fetch(params.size > 0 ? `${baseURL}?${params}` : baseURL)
      if (!response.ok) throw new Error('Failed to fetch budgets')
      return await response.json()
    }
  })

  const patchBudgets = (updater) => {
    queryClient.setQueryData(queryKey, (old) => old ? updater(old) : old)
  }

  // The flat projected-expenses list backs the transaction-matching dropdowns, so it has to
  // follow along whenever the budgets' expenses change.
  const invalidateProjectedExpenses = () =>
    queryClient.invalidateQueries({ queryKey: ['projected-expenses'] })

  const createMonthlyBudgetMutation = useMutation({
    mutationFn: async ({ month, year }) => {
      const response = await fetch(baseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year })
      })

      if (!response.ok) throw new Error('Failed to create monthly budget')
      return await response.json()
    },
    onSuccess: (created) => {
      patchBudgets((old) => [...old, { ...created, projectedExpenses: [] }]
        .sort((left, right) => left.year - right.year || left.month - right.month))
    }
  })

  const deleteMonthlyBudgetMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`${baseURL}/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete monthly budget')
      return id
    },
    onSuccess: (id) => patchBudgets((old) => old.filter((budget) => budget.id !== id))
  })

  const addProjectedExpenseMutation = useMutation({
    mutationFn: async (params) => {
      const response = await fetch(expensesURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) throw new Error('Failed to create projected expense')
      return await response.json()
    },
    onSuccess: (created) => {
      patchBudgets((old) => old.map((budget) => budget.id === created.monthlyBudgetId
        ? { ...budget, projectedExpenses: [...(budget.projectedExpenses || []), created] }
        : budget))
      invalidateProjectedExpenses()
    }
  })

  const updateProjectedExpenseMutation = useMutation({
    mutationFn: async (params) => {
      const response = await fetch(`${expensesURL}/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) throw new Error('Failed to update projected expense')
      return params
    },
    onSuccess: (updated) => {
      patchBudgets((old) => old.map((budget) => ({
        ...budget,
        projectedExpenses: (budget.projectedExpenses || []).map((expense) =>
          expense.id === updated.id ? updated : expense)
      })))
      invalidateProjectedExpenses()
    }
  })

  const deleteProjectedExpenseMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`${expensesURL}/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete projected expense')
      return id
    },
    onSuccess: (id) => {
      patchBudgets((old) => old.map((budget) => ({
        ...budget,
        projectedExpenses: (budget.projectedExpenses || []).filter((expense) => expense.id !== id)
      })))
      invalidateProjectedExpenses()
    }
  })

  // One request rather than a create plus N deletes: the server moves the sources'
  // transactions onto the combined expense, which the delete route would not do.
  const combineProjectedExpensesMutation = useMutation({
    mutationFn: async (params) => {
      const response = await fetch(`${expensesURL}/combine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) throw new Error('Failed to combine projected expenses')
      return { created: await response.json(), sourceExpenseIds: params.sourceExpenseIds }
    },
    onSuccess: ({ created, sourceExpenseIds }) => {
      const removed = new Set(sourceExpenseIds)

      patchBudgets((old) => old.map((budget) => budget.id === created.monthlyBudgetId
        ? {
          ...budget,
          projectedExpenses: [
            ...(budget.projectedExpenses || []).filter((expense) => !removed.has(expense.id)),
            created
          ],
          // The transactions moved with them, so they point at the combined expense now
          transactions: (budget.transactions || []).map((transaction) =>
            removed.has(transaction.projectedExpenseId)
              ? { ...transaction, projectedExpenseId: created.id }
              : transaction)
        }
        : budget))
      invalidateProjectedExpenses()
    }
  })

  return {
    loading: isLoading,
    error,
    monthlyBudgets,
    createNewMonthlyBudget: (month, year) => createMonthlyBudgetMutation.mutateAsync({ month, year }),
    deleteMonthlyBudget: deleteMonthlyBudgetMutation.mutateAsync,
    addNewProjectedExpense: addProjectedExpenseMutation.mutateAsync,
    updateProjectedExpense: updateProjectedExpenseMutation.mutateAsync,
    deleteProjectedExpense: deleteProjectedExpenseMutation.mutateAsync,
    combineProjectedExpenses: combineProjectedExpensesMutation.mutateAsync
  }
}