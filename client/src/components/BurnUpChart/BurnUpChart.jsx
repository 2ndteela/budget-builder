import { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './burnUpChart.css'

const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0
}).format(value || 0)

// recharts paints the SVG from props rather than CSS, so var() cannot be used here. Read
// the design tokens out of the stylesheet instead of restating their values.
function readPalette() {
  const styles = getComputedStyle(document.documentElement)
  const token = (name) => styles.getPropertyValue(name).trim()

  return {
    grid: token('--divider'),
    axis: token('--text-muted'),
    surface: token('--surface-raised'),
    text: token('--text-bright'),
    projected: token('--color-blue-primary'),
    actual: token('--color-negative'),
    income: token('--color-positive')
  }
}

export default function BurnUpChart({ dataPoints = [] }) {
  // A multi-month range runs to a few hundred days, so thin the labels to keep them legible
  const labelInterval = Math.max(0, Math.ceil(dataPoints.length / 12) - 1)
  const palette = useMemo(() => readPalette(), [])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="burnup-chart-container">
      <h2>Expense Burn-Up</h2>
      <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
        <LineChart
          data={dataPoints}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
          <XAxis
            dataKey="date"
            stroke={palette.axis}
            tick={{ fill: palette.axis }}
            interval={labelInterval}
          />
          <YAxis
            stroke={palette.axis}
            tick={{ fill: palette.axis }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: palette.surface,
              border: `1px solid ${palette.grid}`,
              borderRadius: 0,
              color: palette.text
            }}
            formatter={formatCurrency}
            labelStyle={{ color: palette.axis }}
          />
          <Legend
            wrapperStyle={{ color: palette.text }}
          />
          <Line
            type="monotone"
            dataKey="cumulativeProjected"
            stroke={palette.projected}
            name="Projected Expenses"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="cumulativeActual"
            stroke={palette.actual}
            name="Actual Expenses"
            strokeWidth={2}
            dot={{ fill: palette.actual, r: 3 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="cumulativeIncome"
            stroke={palette.income}
            name="Income"
            strokeWidth={2}
            dot={{ fill: palette.income, r: 3 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
