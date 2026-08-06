import React from 'react';
import './ui.css';

/**
 * Skeleton de carga.
 * lines: número de filas tipo texto; height/width para bloques personalizados.
 */
const Skeleton = ({ lines = 0, height, width = '100%', style = {} }) => {
  if (lines > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', ...style }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="ds-skeleton"
            style={{ height: 14, width: i === lines - 1 ? '70%' : '100%' }}
          />
        ))}
      </div>
    );
  }
  return <div className="ds-skeleton" style={{ height: height || 14, width, ...style }} />;
};

export default Skeleton;
