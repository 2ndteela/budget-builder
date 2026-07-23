import {
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

const baseURL = 'http://localhost:5102/expenses'

export default function useProjectedExpenses(categories = []) {
  const queryClient = useQueryClient()

  const expenses = categories?.reduce((acc, current) => {
    return [...acc, ...(current.projectedExpenses || [])]
  }, [])

  // Projected expenses live nested inside each category's projectedExpenses
  // array, so patches target the ['categories'] cache (all date ranges).
  const patchExpenses = (categoryId, updater) => {
    queryClient.setQueriesData({ queryKey: ['categories'] }, (old) => {
      if (!old) return old
      return old.map((c) =>
        c.id === categoryId
          ? { ...c, projectedExpenses: updater(c.projectedExpenses || []) }
          : c
      )
    })
  }

  const addProjectedExpenseMutation = useMutation({
    mutationFn: async (newExpense) => {
      const resp = await fetch(baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newExpense)
      })

      if (!resp.ok) {
        throw new Error('Failed to add projected expense')
      }

      return await resp.json()
    },
    onSuccess: (created) => {
      patchExpenses(created.categoryId, (old) => [...old, created])
    },
    onError: () => {
      alert('Failed to add projected expense')
    }
  })

  const updateProjectedExpenseMutation = useMutation({
    mutationFn: async (updatedExpense) => {
      const resp = await fetch(`${baseURL}/${updatedExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedExpense)
      })

      if (!resp.ok) throw new Error('error in method: Failed to update transaction')
      if (resp.status === 204) return true
      return await resp.json()

    },
    onSuccess: (updated) => {
      patchExpenses(updated.categoryId, (old) =>
        old.map((e) => (e.id === updated.id ? updated : e))
      )
    },
    onError: () => {
      alert('Failed to update projected expense')
    }
  })

  const deleteProjectedExpenseMutation = useMutation({
    mutationFn: async (id) => {
      const resp = await fetch(`${baseURL}/${id}`, {
        method: 'DELETE'
      })

      if (!resp.ok) {
        throw new Error('Failed to delete projected expense')
      }

      return id
    },
    onSuccess: (id) => {
      // id-only response: filter the deleted expense out of every category
      queryClient.setQueriesData({ queryKey: ['categories'] }, (old) => {
        if (!old) return old
        return old.map((c) => ({
          ...c,
          projectedExpenses: (c.projectedExpenses || []).filter((e) => e.id !== id)
        }))
      })
    },
    onError: () => {
      alert('Failed to delete projected expense')
    }
  })

  return {
    expenses,
    addNewProjectedExpense: addProjectedExpenseMutation.mutateAsync,
    updateProjectedExpense: updateProjectedExpenseMutation.mutateAsync,
    deleteProjectExpense: deleteProjectedExpenseMutation.mutateAsync,
  }
}
