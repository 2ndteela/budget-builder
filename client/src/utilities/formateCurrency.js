

export default function formatCurrency(amount) {
  const formatter =
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })

  return formatter.format(amount || 0)
}