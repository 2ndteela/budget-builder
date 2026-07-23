import './categoryChip.css';

export default function CategoryChip({ label, color, onClick, isSelected }) {
  return (
    <button
      className={`category-chip category-chip-${color} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
