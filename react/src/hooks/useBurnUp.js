import { useQuery } from '@tanstack/react-query'

const baseURL = 'http://localhost:5102/budget'

export default function useBurnUp() {
  const params = new URLSearchParams(window.location.search)
  const startDate = params.get('startDate')
  const endDate = params.get('endDate')

  const { data, isLoading } = useQuery({
    queryKey: ['burnup-chart', startDate, endDate],
    queryFn: async () => {
      let url = `${baseURL}/burnup`
      if (startDate) {
        url += `?startDate=${encodeURIComponent(startDate)}`
        if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`
      }

      const resp = await fetch(url)
      if (!resp.ok) throw new Error('Failed to fetch burn-up data')
      return await resp.json()
    }
  })

  return {
    loading: isLoading,
    burnUpData: data
  }
}
