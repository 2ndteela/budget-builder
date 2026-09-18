import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

const baseURL = 'http://localhost:5102/category'

export default function useCategories() {
  const queryClient = useQueryClient()

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const resp = await fetch(baseURL)
      if (!resp.ok) throw new Error('Failed to fetch categories')
      return await resp.json()
    }
  })

  // Apply an updater to every cached categories list (all date ranges)
  const patchCache = (updater) => {
    queryClient.setQueriesData({ queryKey: ['categories'] }, (old) => {
      if (!old) return old
      return updater(old)
    })
  }

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id) => {
      const resp = await fetch(`${baseURL}/${id}`, {
        method: 'DELETE'
      })

      if (!resp.ok) throw new Error('Failed to delete category')
      return id
    },
    onSuccess: (id) => {
      patchCache((old) => old.filter((c) => c.id !== id))
    }
  })

  const addCategoryMutation = useMutation({
    mutationFn: async (params) => {
      const resp = await fetch(baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      if (!resp.ok) throw new Error('Failed to add category')

      return await resp.json()
    },
    onSuccess: (created) => {
      patchCache((old) => [...old, created])
    }
  })

  const updateCategoryMutation = useMutation({
    mutationFn: async (params) => {
      const resp = await fetch(`${baseURL}/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      if (!resp.ok) throw new Error('Failed to update category')
      return params
    },
    onSuccess: (updated) => {
      patchCache((old) => old.map((c) => (c.id === updated.id ? updated : c)))
    }
  })

  return {
    loading: isLoading,
    error,
    categories: categories || [],
    deleteCategory: deleteCategoryMutation.mutateAsync,
    addNewCategory: addCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync
  }
}
