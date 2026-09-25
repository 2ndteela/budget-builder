import { useState, useEffect } from 'react'
import { BiCaretDown, BiCaretRight } from 'react-icons/bi'
import './waterfallSelector.css'

/**
 * @param {label} String - Label for the selector
 * @param {value} String - Currently selected value to display
 * @param {onChange} Function - Callback when leaf option is selected
 * @param {menuOptions} Array of options for the waterfall. Takes this shape: {
 *  label: String
 *  value: Any as long as it is unique
 *  optionColor: String - color key from supportedColors (e.g. 'blue', 'red')
 *  children: [{
 *    label: String
 *    value: Any
 *    optionColor: String
 *    children: ... This array can theoretically drill down as far as the user wants,
 *    repeating the structure of label, value, optionColor, and children
 * }]
 * }
 */
export default function WaterfallSelector({ label, value, onChange, menuOptions = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredPath, setHoveredPath] = useState([])
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const handleSelect = (option, currentPath) => {
    const hasChildren = option.children && option.children.length > 0

    if (isTouchDevice && hasChildren) {
      // On touch devices, clicking a parent toggles its children
      const pathKey = currentPath.join('-')
      const isCurrentlyOpen = hoveredPath.slice(0, currentPath.length).join('-') === pathKey
      setHoveredPath(isCurrentlyOpen ? [] : currentPath)
    } else if (!hasChildren) {
      // Select leaf nodes
      onChange(option)
      setIsOpen(false)
      setHoveredPath([])
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setHoveredPath([])
  }

  const renderOptions = (options, depth = 0, parentPath = []) => {
    return (
      <div className="waterfall-options" style={{ left: `${depth * 100}%` }}>
        {options.map((option, index) => {
          const currentPath = [...parentPath, index]
          const pathKey = currentPath.join('-')
          const isHovered = hoveredPath.slice(0, currentPath.length).join('-') === pathKey
          const hasChildren = option.children && option.children.length > 0

          return (
            <div key={option.value}>
              <div
                className={`waterfall-option ${option.optionColor ? `color-${option.optionColor}` : ''}`}
                onMouseEnter={!isTouchDevice ? () => setHoveredPath(currentPath) : undefined}
                onClick={() => handleSelect(option, currentPath)}
              >
                <span>{option.label}</span>
                {hasChildren && <BiCaretRight />}
              </div>
              {hasChildren && isHovered && renderOptions(option.children, depth + 1, currentPath)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="waterfall-container">
      <div
        className={`waterfall-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="waterfall-trigger-content">
          <label>{label}</label>
          <div className="waterfall-value">{value}</div>
        </div>
        <BiCaretDown className={`waterfall-caret ${isOpen ? 'open' : ''}`} />
      </div>

      {isOpen && (
        <>
          <div className="waterfall-menu">
            {renderOptions(menuOptions)}
          </div>
          <div className="waterfall-scrim" onClick={handleClose} />
        </>
      )}
    </div>
  )
}
