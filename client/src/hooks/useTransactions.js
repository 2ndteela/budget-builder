import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

const baseURL = 'http://localhost:5102/transactions'

export default function useTransactions() {
  const queryClient = useQueryClient()
  const params = new URLSearchParams(window.location.search)
  const startDate = params.get('startDate')
  const endDate = params.get('endDate')
  const queryKey = ['transactions', startDate, endDate]

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let url = baseURL
      if (startDate) {
        url += `?startDate=${encodeURIComponent(startDate)}`
        if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`
      }

      const resp = await fetch(url)
      if (!resp.ok) {
        throw new Error('Failed to fetch transactions')
      }
      return await resp.json()
    }
  })

  // Apply an updater to the cached list for the current date range
  const patchCache = (updater) => {
    queryClient.setQueryData(queryKey, (old) => {
      if (!old) return old
      return updater(old)
    })
  }

  const addTransactionMutation = useMutation({
    mutationFn: async (newTransaction) => {
      const resp = await fetch(baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTransaction)
      })

      if (!resp.ok) throw new Error('Failed to add new transaction')
      return await resp.json()
    },
    onSuccess: (newTransaction) => {
      patchCache((old) => [newTransaction, ...old])
      queryClient.invalidateQueries({ queryKey: ['monthly-budget'] })
    }
  })

  const addTransactionsBulkMutation = useMutation({
    mutationFn: async (transactionsArray) => {
      const resp = await fetch(`${baseURL}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionsArray)
      })

      if (!resp.ok) throw new Error('Failed to add bulk transactions')
      return await resp.json()
    },
    onSuccess: (newTransactions) => {
      patchCache((old) => [...newTransactions.acceptedTransactions, ...old])
      queryClient.invalidateQueries({ queryKey: ['monthly-budget'] })
    }
  })

  const updateTransactionMutation = useMutation({
    mutationFn: async (params) => {
      const resp = await fetch(`${baseURL}/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      if (!resp.ok) throw new Error('error in method: Failed to update transaction')
      return params
    },
    onSuccess: (updatedTransaction) => {
      patchCache((old) => old.map(t => t.id === updatedTransaction.id ? updatedTransaction : t))
      queryClient.invalidateQueries({ queryKey: ['monthly-budget'] })
    }
  })

  // Books a selection onto one plan in a single request. The response says where each row
  // landed, since clearing the plan spreads them across each month's own Unassigned bucket.
  const assignTransactionsMutation = useMutation({
    mutationFn: async ({ transactionIds, projectedExpenseId }) => {
      const resp = await fetch(`${baseURL}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transactionIds, projectedExpenseId: projectedExpenseId || null })
      })

      if (!resp.ok) throw new Error('Failed to assign transactions')
      return await resp.json()
    },
    onSuccess: (assigned) => {
      const expenseIdById = new Map(assigned.map((t) => [t.id, t.projectedExpenseId]))

      patchCache((old) => old.map((t) => expenseIdById.has(t.id)
        ? { ...t, projectedExpenseId: expenseIdById.get(t.id) }
        : t))
      queryClient.invalidateQueries({ queryKey: ['monthly-budget'] })
    }
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id) => {
      const resp = await fetch(`${baseURL}/${id}`, {
        method: 'DELETE'
      })

      if (!resp.ok) throw new Error('Failed to delete transaction')
      return id
    },
    onSuccess: (deletedId) => {
      patchCache((old) => old.filter(t => t.id !== deletedId))
      queryClient.invalidateQueries({ queryKey: ['monthly-budget'] })
    }
  })

  return {
    loading: isLoading,
    error,
    transactions: data || [],
    addTransaction: addTransactionMutation.mutateAsync,
    addTransactionsBulk: addTransactionsBulkMutation.mutateAsync,
    updateTransaction: updateTransactionMutation.mutateAsync,
    assignTransactions: assignTransactionsMutation.mutateAsync,
    deleteTransaction: deleteTransactionMutation.mutateAsync
  }
}
