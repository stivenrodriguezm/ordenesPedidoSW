import React from 'react';
import './ui.css';

/**
 * Encabezado estándar de página: título + subtítulo opcional + acciones.
 * Reemplaza las toolbars "glass-header" duplicadas por página.
 */
const PageHeader = ({ icon: Icon, title, subtitle, actions }) => {
  return (
    <div className="ds-page-header">
      <div className="ds-page-header__title-group">
        {Icon && (
          <div className="ds-page-header__icon">
            <Icon />
          </div>
        )}
        <div>
          <h1 className="ds-page-header__title">{title}</h1>
          {subtitle && <p className="ds-page-header__subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="ds-page-header__actions">{actions}</div>}
    </div>
  );
};

export default PageHeader;
