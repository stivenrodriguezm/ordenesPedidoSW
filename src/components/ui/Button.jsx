import React from 'react';
import './ui.css';

/**
 * Botón del design system.
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-soft'
 * size: 'sm' | 'md' | 'lg'
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  block = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
  className = '',
  ...rest
}) => {
  const classes = [
    'ds-btn',
    `ds-btn--${variant}`,
    size !== 'md' && `ds-btn--${size}`,
    block && 'ds-btn--block',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? <span className="ds-btn__spinner" /> : Icon ? <Icon /> : null}
      {children}
    </button>
  );
};

export default Button;
