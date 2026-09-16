import './expansionPanel.css';

export default function ExpansionPanel({ title, children, defaultExpanded = false, color = 'gray' }) {
  return (
    <details open={defaultExpanded} className={`expansion-panel color-${color}`}>
      <summary>{title}</summary>
      <div className="expansion-panel-body">
        {children}
      </div>
    </details>
  );
}
