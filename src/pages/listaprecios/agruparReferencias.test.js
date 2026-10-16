import { describe, expect, it } from 'vitest';
import { agruparReferencias } from './agruparReferencias';

describe('Agrupar referencias sin combinar sus precios', () => {
  const refs = [
    { id: 1, nombre: 'Valencia', proveedor: 10, proveedor_nombre: 'Norte', linea: { id: 10 } },
    { id: 2, nombre: 'VALENCIA', proveedor: 11, proveedor_nombre: 'Sur', linea: { id: 11 } },
    { id: 3, nombre: 'Valencia', proveedor: 10, proveedor_nombre: 'Norte', linea: null },
    { id: 4, nombre: 'Roma', proveedor: 10, proveedor_nombre: 'Norte', linea: null },
  ];
  it('junta nombres para presentación y conserva todos los IDs y configuraciones', () => {
    const resultado = agruparReferencias(refs, 'referencia');
    expect(resultado).toHaveLength(2);
    expect(resultado[1].referencias.map(r => r.id)).toEqual([1, 3, 2]);
    expect(resultado[1].referencias.map(r => r.linea?.id)).toEqual([10, undefined, 11]);
  });
  it('agrupa por ID de proveedor, incluso dos proveedores con el mismo nombre', () => {
    const resultado = agruparReferencias(refs.map(r => ({ ...r, proveedor_nombre: 'Mismo nombre' })), 'proveedor');
    expect(resultado).toHaveLength(2);
    expect(resultado.map(g => g.referencias.length).sort()).toEqual([1, 3]);
  });
});
