import React from 'react';
import './ui.css';

/**
 * Tarjeta de métrica.
 * tone: 'accent' (default) | 'success' | 'warning' | 'danger' | 'info'
 */
const StatCard = ({ icon: Icon, label, value, hint, tone, onClick }) => {
  return (
    <div
      className={`ds-stat ${onClick ? 'ds-stat--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {Icon && (
        <div className={`ds-stat__icon ${tone ? `ds-stat__icon--${tone}` : ''}`}>
          <Icon />
        </div>
      )}
      <div className="ds-stat__body">
        <div className="ds-stat__label">{label}</div>
        <div className="ds-stat__value">{value}</div>
        {hint && <div className="ds-stat__hint">{hint}</div>}
      </div>
    </div>
  );
};

export default StatCard;
