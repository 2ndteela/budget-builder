import { MdClear } from 'react-icons/md'
import './clearableInput.css'

export default function ClearableInput({ value, onChange, placeholder = '', label, type = 'text', width, ...props }) {
  const handleClear = () => {
    onChange({ target: { value: '' } })
  }

  return (
    <div className='clearable-input-container' style={width ? { width } : {}}>
      {label && <label>{label}</label>}
      <div className="clearable-input">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          {...props}
        />
        {value && value.length > 0 && (
          <button
            type="button"
            className="clear-button"
            onClick={handleClear}
            aria-label="Clear input"
          >
            <MdClear />
          </button>
        )}
      </div>
    </div>
  )
}
