import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

import { useState, useEffect } from 'react'

const baseURL = 'http://localhost:5102/transactions'

export default function useTransactions() {
  const queryClient = useQueryClient()
  const params = new URLSearchParams(window.location.search)
  const startDate = params.get('startDate')
  const endDate = params.get('endDate')
  const queryKey = ['transactions', startDate, endDate]
  const [transactions, setTransactions] = useState([])

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

  useEffect(() => {
    if (data && !isLoading && !error) setTransactions(data)
  }, [data, isLoading, error])

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
      setTransactions((old) => [newTransaction, ...old])
      queryClient.invalidateQueries({ queryKey: ['budget-analysis'] })
    },
    onError: () => {
      throw new Error('Failed to add transaction')
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
      setTransactions((old) => [...newTransactions.acceptedTransactions, ...old])
      queryClient.invalidateQueries({ queryKey: ['budget-analysis'] })
    },
    onError: () => {
      throw new Error('Failed to add transactions')
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
      setTransactions((old) => old.map(t => t.id === updatedTransaction.id ? updatedTransaction : t))
      queryClient.invalidateQueries({ queryKey: ['budget-analysis'] })
    },
    onError: (err) => {
      console.error(err)
      throw new Error('Failed to update transaction')
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
      setTransactions((old) => old.filter(t => t.id !== deletedId))
      queryClient.invalidateQueries({ queryKey: ['budget-analysis'] })
    },
    onError: () => {
      throw new Error('Failed to delete transaction')
    }
  })

  return {
    loading: isLoading,
    error,
    transactions: transactions || [],
    addTransaction: addTransactionMutation.mutateAsync,
    addTransactionsBulk: addTransactionsBulkMutation.mutateAsync,
    updateTransaction: updateTransactionMutation.mutateAsync,
    deleteTransaction: deleteTransactionMutation.mutateAsync
  }
}
