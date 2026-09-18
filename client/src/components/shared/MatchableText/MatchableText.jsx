import './matchableText.css'

export default function MatchableText({ value, searchText }) {
  if (!searchText || searchText.length === 0) {
    return <span>{value}</span>
  }

  const searchLower = searchText.toLowerCase()
  const valueLower = value.toLowerCase()
  const index = valueLower.indexOf(searchLower)

  if (index === -1) {
    return <span>{value}</span>
  }

  const before = value.substring(0, index)
  const match = value.substring(index, index + searchText.length)
  const after = value.substring(index + searchText.length)

  return (
    <span>
      {before}
      <span className="matched-text">{match}</span>
      {after}
    </span>
  )
}
