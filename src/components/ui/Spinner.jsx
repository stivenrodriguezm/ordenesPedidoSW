import React from 'react';
import './ui.css';

/** Spinner inline. size: 'sm' | 'md' | 'lg' */
export const Spinner = ({ size = 'md' }) => (
  <span className={`ds-spinner ds-spinner--${size}`} role="status" aria-label="Cargando" />
);

/** Bloque de carga centrado con mensaje, para secciones/páginas. */
export const LoadingBlock = ({ message = 'Cargando...' }) => (
  <div className="ds-loading-block">
    <Spinner size="lg" />
    <span>{message}</span>
  </div>
);
