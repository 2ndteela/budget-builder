import './editableField.css'
import { useCallback, useState, useEffect, useRef } from 'react'

function ReadOnlyValue({ val, emptyDisplayValue, type, prefix, formatOptions }) {
  if (type === 'number' && val !== null && val !== undefined && val !== '') {
    return <>{`${prefix}${Number(val).toLocaleString('en', formatOptions || {})}`}</>
  }
  return <div className='read-only-value'>{val || emptyDisplayValue}</div>
}

function BasicEditableField({
  type,
  value,
  setValue,
  editMode,
  placeholder,
  min,
  max,
  step,
  formatOptions,
  prefix = '',
  emptyDisplayValue = ''
}) {

  return (
    <span className="editable-field">
      {editMode ? (
        <input
          type={type}
          value={value}
          onChange={({ target }) => setValue(type === 'number' ? Number(target.value) || 0 : target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
        />
      ) : <ReadOnlyValue {...{ val: value, editMode, emptyDisplayValue, type, prefix, formatOptions }} />}
    </span>
  )
}

function EditableDateField({ value, setValue, editMode }) {
  // draft holds the raw text while the user types (so a half-typed year isn't
  // clobbered); null means "show whatever the value prop says".
  const [draft, setDraft] = useState(null)
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef(null)
  const triggerRef = useRef(null)

  const date = new Date(value)
  const inputValues = draft || {
    month: date.getMonth() + 1,
    date: date.getDate(),
    year: date.getFullYear()
  }

  const closePopover = useCallback(() => {
    setShowPopover(false)
    setDraft(null)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showPopover &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        closePopover()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPopover, closePopover])

  const updateDateField = (field, inputValue) => {
    setDraft({ ...inputValues, [field]: inputValue })

    if (inputValue === '' || inputValue === null) {
      return
    }

    const numValue = Number(inputValue)
    if (isNaN(numValue)) {
      return
    }

    const newDate = new Date(value)
    if (field === 'month') {
      if (numValue >= 1 && numValue <= 12) newDate.setMonth(numValue - 1)
      else return
    } else if (field === 'date') {
      if (numValue >= 1 && numValue <= 31) newDate.setDate(numValue)
      else return
    } else if (field === 'year') {
      if (numValue >= 1000 && numValue <= 9999) newDate.setFullYear(numValue)
      else return
    }

    setValue(newDate.getTime())
  }

  return editMode ? (
    <div className="editable-field editable-date-wrapper" ref={triggerRef}>
      <button
        type="button"
        className="date-trigger-button"
        onClick={() => showPopover ? closePopover() : setShowPopover(true)}
      >
        {new Date(value).toLocaleDateString()}
      </button>
      {showPopover && (
        <div className="date-popover" ref={popoverRef}>
          <div className="date-inputs-popover">
            <input
              type="number"
              value={inputValues.month}
              placeholder='MM'
              min="1"
              max="12"
              onChange={({ target }) => updateDateField('month', target.value)}
            />
            /
            <input
              type="number"
              value={inputValues.date}
              placeholder='DD'
              min="1"
              max="31"
              onChange={({ target }) => updateDateField('date', target.value)}
            />
            /
            <input
              type="number"
              value={inputValues.year}
              placeholder='YYYY'
              min="1000"
              max="9999"
              onChange={({ target }) => updateDateField('year', target.value)}
            />
          </div>
        </div>
      )}
    </div>
  ) : (
    <span className="editable-field">{new Date(value).toLocaleDateString()}</span>
  )
}

function EditableSelectField({ value, setValue, editMode, options, displayValue }) {
  return (
    <span className="editable-field">
      {editMode ? (
        <select value={value} onChange={({ target }) => setValue(target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        displayValue || value
      )}
    </span>
  )
}

export default function EditableField(props) {
  const { type = 'text' } = props
  if (type === 'select') return <EditableSelectField {...props} />
  if (type === 'date') return <EditableDateField {...props} />
  return <BasicEditableField {...props} />
}
