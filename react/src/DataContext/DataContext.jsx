import useAccounts from '../hooks/useAccounts'
import useBudget from '../hooks/useBudget'
import useBurnUp from '../hooks/useBurnUp'
import useCategories from '../hooks/useCategories'
import useMonthlyBudget from '../hooks/useMonthlyBudget'
import useProjectedExpenses from '../hooks/useProjectedExpenses'
import useTransactions from '../hooks/useTransactions'
import DataContext from './context'

export function DataProvider({ startDate, endDate, children }) {
	const categories = useCategories()
	const accounts = useAccounts()
	const transactions = useTransactions()
	const monthlyBudgets = useMonthlyBudget(startDate, endDate)
	const projectedExpenses = useProjectedExpenses()
	const budget = useBudget()
	const burnUp = useBurnUp()

	return (
		<DataContext.Provider value={{
			categories,
			accounts,
			transactions,
			monthlyBudgets,
			projectedExpenses,
			budget,
			burnUp,
			dateRange: { startDate, endDate }
		}}>
			{children}
		</DataContext.Provider>
	)
}
