import { useState, useRef, useEffect } from 'react';
import './expansionPanel.css';

export default function ExpansionPanel({ title, children, defaultExpanded = false, color = 'gray' }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(defaultExpanded ? 'auto' : '0px');

  useEffect(() => {
    if (isExpanded) {
      setHeight(`${contentRef.current.scrollHeight}px`);
      setTimeout(() => setHeight('auto'), 300);
    } else {
      setHeight(`${contentRef.current.scrollHeight}px`);
      setTimeout(() => setHeight('0px'), 0);
    }
  }, [isExpanded]);

  return (
    <div className={`expansion-panel color-${color}`}>
      <button
        className="expansion-panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="expansion-panel-title">{title}</span>
        <span className={`expansion-panel-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>
      <div
        ref={contentRef}
        className="expansion-panel-content"
        style={{ height }}
      >
        <div className="expansion-panel-body">
          {children}
        </div>
      </div>
    </div>
  );
}
