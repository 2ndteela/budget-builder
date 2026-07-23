import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

const baseURL = 'http://localhost:5102/category'

export default function useCategories(startDate = null, endDate = null, filterCategories = false) {
  const queryClient = useQueryClient()

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories', startDate, endDate],
    queryFn: async () => {
      let url = baseURL
      if (startDate && filterCategories) {
        url += `?startDate=${encodeURIComponent(startDate)}`
        if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`
      }


      const resp = await fetch(url)
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
    },
    onError: () => {
      alert('Failed to delete category')
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
    },
    onError: () => {
      alert('Failed to add category')
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
    },
    onError: () => {
      alert('Failed to update category')
    }
  })

  return {
    loading: isLoading,
    error,
    categories: categories || [],
    deleteCategory: deleteCategoryMutation.mutate,
    addNewCategory: addCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate
  }
}
