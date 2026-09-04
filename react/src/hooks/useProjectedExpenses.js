import { useQuery } from '@tanstack/react-query'

const baseURL = 'http://localhost:5102/expenses'

export default function useProjectedExpenses() {
  const { data: projectedExpenses = [], isLoading, error } = useQuery({
    queryKey: ['projected-expenses'],
    queryFn: async () => {
      const response = await fetch(baseURL)
      if (!response.ok) throw new Error('Failed to fetch projected expenses')
      return await response.json()
    }
  })

  return {
    loading: isLoading,
    error,
    projectedExpenses
  }
}