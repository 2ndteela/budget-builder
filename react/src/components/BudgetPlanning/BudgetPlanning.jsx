import AccountsManager from './AccountsManager/AccountsManager'
import BudgetBuilder from './BudgetBuilder/BudgetBuilder'
import CategoriesManager from './BudgetBuilder/components/CategoriesManager/CategoriesManager'
import './budgetPlanning.css'

export default function ProjectedCosts() {
  return (
    <div className="projected-costs-container">
      <div className='row-container'>
        <CategoriesManager />
        <AccountsManager />
      </div>
      <BudgetBuilder />
    </div>
  )
}
