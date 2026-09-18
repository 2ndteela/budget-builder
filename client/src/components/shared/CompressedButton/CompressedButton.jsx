import './compressedButton.css'

export default function CompressedButton({ Icon, children, color = 'blue', onClick = () => { } }) {
  return (
    <button className={`compressed-button btn-${color}`} onClick={onClick}>
      <span className="compressed-button-icon" ><Icon /></span>
      <span className="compressed-button-text-wrapper">
        <span className="compressed-button-text">{children}</span>
      </span>
    </button>
  )
}
