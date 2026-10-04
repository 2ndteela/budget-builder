import { useMemo, useState, useEffect } from 'react'
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'
import { MdArrowBack } from 'react-icons/md'
import CompressedButton from '../shared/CompressedButton/CompressedButton'
import './breakDownChart.css'

// A long tail of tiny slices is unreadable, so anything past this folds into "Other"
const MAX_SLICES = 8

const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(value || 0)

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`

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
    colorFor: (color) => token(`--color-${color || 'gray'}-primary`) || token('--color-gray-primary')
  }
}

// Sorted biggest first and capped, with the remainder rolled into one "Other" slice
function toSlices(items) {
  const sorted = items
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value)

  if (sorted.length <= MAX_SLICES) return sorted

  const kept = sorted.slice(0, MAX_SLICES - 1)
  const rest = sorted.slice(MAX_SLICES - 1)

  return [...kept, {
    key: 'other',
    name: `Other (${rest.length})`,
    value: rest.reduce((sum, item) => sum + item.value, 0),
    isOther: true
  }]
}

// Every expense category's share of the total spent. Income is left out — it is not spend.
function buildCategorySlices(categories, palette) {
  return toSlices(categories
    .filter((category) => !category.isIncome)
    .map((category) => ({
      key: category.id,
      categoryId: category.id,
      name: category.name,
      value: category.transactionTotal
    })))
    .map((slice) => {
      const category = categories.find((item) => item.id === slice.categoryId)
      return { ...slice, fill: palette.colorFor(slice.isOther ? 'gray' : category?.color) }
    })
}

// One category's spend by transaction title. The same merchant can be booked against more
// than one projected expense, so groups are merged across them by title.
function buildTransactionSlices(category, palette) {
  const byTitle = new Map()

  category.projectedExpenses.forEach((expense) => {
    expense.transactionGroups.forEach((group) => {
      const existing = byTitle.get(group.title)
      if (existing) existing.value += group.total
      else byTitle.set(group.title, { key: group.title, name: group.title, value: group.total })
    })
  })

  const slices = toSlices([...byTitle.values()])
  const fill = palette.colorFor(category.color)

  // All in the category's own color, stepping down in strength so the slices stay distinct
  return slices.map((slice, index) => ({
    ...slice,
    fill,
    fillOpacity: 1 - (index / Math.max(slices.length, 1)) * 0.7
  }))
}

/**
 * A pie chart with two modes:
 * 1). All categories: what share of total spend each expense category took
 * 2). Specific category: how a category's transactions break down, by title
 *
 * Clicking a slice (or its legend row) in the all categories view drills into that
 * category; the back button returns to all categories.
 *
 * @param {categories} array of categories from buildBudgetAnalysis
 */
export default function BreakDownChart({ categories = [] }) {
  const palette = useMemo(() => readPalette(), [])
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Falls back to all categories if the selection drops out of range (e.g. a date change)
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId)

  const slices = useMemo(() => selectedCategory
    ? buildTransactionSlices(selectedCategory, palette)
    : buildCategorySlices(categories, palette),
  [categories, selectedCategory, palette])

  const total = slices.reduce((sum, slice) => sum + slice.value, 0)

  const drillInto = (slice) => {
    if (selectedCategory || slice.isOther || slice.categoryId == null) return
    setSelectedCategoryId(slice.categoryId)
  }

  const canDrill = (slice) => !selectedCategory && !slice.isOther

  return (
    <div className='breakdown-chart-container'>
      <div className='breakdown-chart-header'>
        <h2>{selectedCategory ? `${selectedCategory.name} Breakdown` : 'Spending by Category'}</h2>
        {selectedCategory && (
          <CompressedButton color='gray' Icon={MdArrowBack} onClick={() => setSelectedCategoryId(null)}>
            All Categories
          </CompressedButton>
        )}
      </div>

      {slices.length === 0 ? (
        <p className='breakdown-chart-empty'>No spending to break down yet</p>
      ) : (
        <div className='breakdown-chart-body'>
          <div className='breakdown-chart-pie'>
            <ResponsiveContainer width='100%' height={isMobile ? 260 : 360}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey='value'
                  nameKey='name'
                  innerRadius='45%'
                  outerRadius='90%'
                  stroke={palette.surface}
                  strokeWidth={2}
                  isAnimationActive={false}
                  onClick={drillInto}
                  className={selectedCategory ? undefined : 'drillable'}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.surface,
                    border: `1px solid ${palette.grid}`,
                    borderRadius: 0,
                    color: palette.text
                  }}
                  itemStyle={{ color: palette.text }}
                  formatter={(value) => `${formatCurrency(value)} (${formatPercent(value / total)})`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className='breakdown-chart-legend'>
            {slices.map((slice) => (
              <li
                key={slice.key}
                className={canDrill(slice) ? 'drillable' : undefined}
                onClick={canDrill(slice) ? () => drillInto(slice) : undefined}
              >
                <span
                  className='breakdown-swatch'
                  style={{ backgroundColor: slice.fill, opacity: slice.fillOpacity ?? 1 }}
                />
                <span className='breakdown-legend-name'>{slice.name}</span>
                <span className='breakdown-legend-value'>{formatCurrency(slice.value)}</span>
                <span className='breakdown-legend-percent'>{formatPercent(slice.value / total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
