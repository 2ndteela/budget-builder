import './editableField.css'

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
  return <BasicEditableField {...props} />
}
