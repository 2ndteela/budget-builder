import {
  useQuery,
} from '@tanstack/react-query'

const baseURL = 'http://localhost:5102/budget'

export default function useBudget() {
  const params = new URLSearchParams(window.location.search)
  const startDate = params.get('startDate')
  const endDate = params.get('endDate')
  const { data, isLoading } = useQuery({
    queryKey: ['budget-analysis', startDate, endDate],
    queryFn: async () => {
      try {
        let url = `${baseURL}/analysis`
        if (startDate) {
          url += `?startDate=${encodeURIComponent(startDate)}`
          if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`
        }

        const blob = await fetch(url)
        if (!blob.ok) throw new Error('Failed to fetch budget')
        const resp = await blob.json()
        return resp

      } catch (error) {
        console.error('Error fetching budget:', error)

      }
    }
  })

  return {
    loading: isLoading,
    budget: data
  }
}
