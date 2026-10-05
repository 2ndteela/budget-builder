import { useState, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [isTouchDevice] = useState(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  // The menu renders in a portal on body so dialogs and scrolling tables cannot clip it,
  // which means it has to follow the trigger by hand and keep itself inside the viewport.
  // Runs before paint, writing styles straight to the DOM since they depend on measuring it.
  useLayoutEffect(() => {
    if (!isOpen) return

    const placeMenu = () => {
      const menu = menuRef.current
      const trigger = triggerRef.current
      if (!menu || !trigger) return

      const gap = 4
      const viewportBottom = window.innerHeight - gap
      const viewportRight = window.innerWidth - gap
      const triggerRect = trigger.getBoundingClientRect()

      // Root panel opens below the trigger, or above it when there is no room below
      menu.style.top = `${triggerRect.bottom + gap}px`
      menu.style.left = `${triggerRect.left}px`
      const rootRect = menu.firstElementChild.getBoundingClientRect()
      if (rootRect.bottom > viewportBottom) {
        menu.style.top = `${Math.max(gap, triggerRect.top - gap - rootRect.height)}px`
      }
      if (rootRect.right > viewportRight) {
        menu.style.left = `${Math.max(gap, viewportRight - rootRect.width)}px`
      }

      // Child panels cascade right, or left when that runs off screen, and slide up to fit.
      // Document order puts parents first, so each child measures against its placed parent.
      menu.querySelectorAll('.waterfall-options .waterfall-options').forEach((panel) => {
        panel.style.cssText = ''
        const rect = panel.getBoundingClientRect()

        if (rect.right > viewportRight) {
          Object.assign(panel.style, { left: 'auto', right: '100%', marginLeft: '0', marginRight: '-1px' })
        }
        if (rect.bottom > viewportBottom) {
          const shift = Math.min(rect.bottom - viewportBottom, rect.top - gap)
          panel.style.top = `${-1 - shift}px`
        }
      })
    }

    placeMenu()
    window.addEventListener('scroll', placeMenu, true)
    window.addEventListener('resize', placeMenu)
    return () => {
      window.removeEventListener('scroll', placeMenu, true)
      window.removeEventListener('resize', placeMenu)
    }
  }, [isOpen, hoveredPath, menuOptions])

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

  const renderOptions = (options, parentPath = []) => {
    return (
      <div className="waterfall-options">
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
              {hasChildren && isHovered && renderOptions(option.children, currentPath)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="waterfall-container">
      <div
        ref={triggerRef}
        className={`waterfall-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="waterfall-trigger-content">
          <label>{label}</label>
          <div className="waterfall-value">{value}</div>
        </div>
        <BiCaretDown className={`waterfall-caret ${isOpen ? 'open' : ''}`} />
      </div>

      {isOpen && createPortal(
        <>
          <div className="waterfall-menu" ref={menuRef}>
            {renderOptions(menuOptions)}
          </div>
          <div className="waterfall-scrim" onClick={handleClose} />
        </>,
        document.body
      )}
    </div>
  )
}
