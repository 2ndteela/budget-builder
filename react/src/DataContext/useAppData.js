import { useContext } from 'react'
import DataContext from './context'

export default function useAppData() {
  const data = useContext(DataContext)
  if (!data) throw new Error('useAppData must be used within DataProvider')

  return data
}