import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import useAppData from '../../DataContext/useAppData'
import LoadingSpinner from '../shared/LoadingSpinner/LoadingSpinner'
import './burnUpChart.css'

export default function BurnUpChart() {
  const { burnUp: { loading, burnUpData } } = useAppData()

  if (loading) return <LoadingSpinner />

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="burnup-chart-container">
      <h2>Expense Burn-Up</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={burnUpData?.dataPoints || []}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="date"
            stroke="#999"
            tick={{ fill: '#999' }}
          />
          <YAxis
            stroke="#999"
            tick={{ fill: '#999' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#e5e5e5'
            }}
            formatter={formatCurrency}
            labelStyle={{ color: '#999' }}
          />
          <Legend
            wrapperStyle={{ color: '#e5e5e5' }}
          />
          <Line
            type="monotone"
            dataKey="cumulativeProjected"
            stroke="#276cc6"
            name="Projected Expenses"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="cumulativeActual"
            stroke="#ef4444"
            name="Actual Expenses"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 3 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="cumulativeIncome"
            stroke="#22c55e"
            name="Income"
            strokeWidth={2}
            dot={{ fill: '#22c55e', r: 3 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
