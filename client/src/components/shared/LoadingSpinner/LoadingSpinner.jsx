import './loadingSpinner.css'

export default function LoadingSpinner({ size = 'medium' }) {
  return (
    <div className={`loading-spinner-container ${size}`}>
      <div className="loading-spinner"></div>
    </div>
  )
}
