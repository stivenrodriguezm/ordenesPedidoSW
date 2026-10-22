import React from 'react';

export default function ProveedoresAgrupacion({ componentes = [] }) {
  const proveedores = [...new Map(componentes.filter(c => c.proveedor_nombre).map(c => [c.proveedor ?? c.proveedor_nombre, c.proveedor_nombre])).values()];
  const texto = proveedores.join(' · ') || 'Según las piezas';
  return <div className="lp-proveedor-subcategoria lp-proveedor-conjunto">
    <span>{proveedores.length === 1 ? 'Proveedor' : 'Proveedores de las piezas'}</span>
    <p title={texto}>{texto}</p>
  </div>;
}
