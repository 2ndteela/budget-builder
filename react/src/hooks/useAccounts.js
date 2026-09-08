import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

const baseURL = 'http://localhost:5102/accounts'

export default function useAccounts() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const resp = await fetch(baseURL)
      if (!resp.ok) throw new Error('Failed to fetch accounts')
      return await resp.json()
    }
  })

  const patchCache = (updater) => {
    queryClient.setQueryData(['accounts'], (old) => {
      if (!old) return old
      return updater(old)
    })
  }

  const addAccountMutation = useMutation({
    mutationFn: async (newAccount) => {
      const resp = await fetch(baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAccount)
      })

      if (!resp.ok) throw new Error('Failed to add account')

      return await resp.json()
    },
    onSuccess: (created) => {
      patchCache((old) => [...old, created])
    }
  })

  const updateAccountMutation = useMutation({
    mutationFn: async (params) => {
      const resp = await fetch(`${baseURL}/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      if (!resp.ok) throw new Error('Failed to update account')

      return params
    },
    onSuccess: (updated) => {
      patchCache((old) => old.map((a) => (a.id === updated.id ? updated : a)))
    }
  })

  const deleteAccountMutation = useMutation({
    mutationFn: async (id) => {
      const resp = await fetch(`${baseURL}/${id}`, {
        method: 'DELETE'
      })

      if (!resp.ok) throw new Error('Failed to delete account')

      return id
    },
    onSuccess: (id) => {
      patchCache((old) => old.filter((a) => a.id !== id))
    }
  })

  return {
    loading: isLoading,
    error,
    accounts: data || [],
    addAccount: addAccountMutation.mutateAsync,
    updateAccount: updateAccountMutation.mutateAsync,
    deleteAccount: deleteAccountMutation.mutateAsync
  }
}
