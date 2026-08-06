import React from 'react';
import './ui.css';

/**
 * Pill de estado.
 * tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'
 */
const Badge = ({ tone = 'neutral', children }) => (
  <span className={`ds-badge ds-badge--${tone}`}>{children}</span>
);

export default Badge;
